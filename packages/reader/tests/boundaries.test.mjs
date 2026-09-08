import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function loadModule(name) {
  const result = await build({
    entryPoints: [new URL(`../src/${name}.ts`, import.meta.url).pathname],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}

const { ReadProgressSyncer, createReadProgressPublisher } =
  await loadModule("ReadProgressSyncer");
const { createReaderSettings } = await loadModule("settings");
const { createPreviewCache } = await loadModule("PreviewCache");
const { SurfaceStack } = await loadModule("SurfaceStack");
const { lockPageScroll } = await loadModule("App/viewport");

test("progress sync is directional and disconnects", () => {
  const reader = createReadProgressPublisher();
  const preview = createReadProgressPublisher();
  let readerPage = 1;
  let previewPage = 1;
  preview.subscribe((page) => {
    readerPage = page;
  });
  const sync = new ReadProgressSyncer(reader, {
    setProgress: (page) => {
      previewPage = page;
    },
  });
  reader.publish(8);
  assert.equal(previewPage, 8);
  assert.equal(readerPage, 1);
  sync.dispose();
  reader.publish(9);
  assert.equal(previewPage, 8);
});

test("settings are isolated per instance and notify only subscribed keys", () => {
  const changes = [];
  const first = createReaderSettings(
    {},
    { previewDirection: (value) => changes.push(value) },
  );
  const second = createReaderSettings();
  first.set("previewDirection", "ltr");
  first.set("previewDirection", "ltr");
  first.set("scrollTtbScale", 2);
  assert.equal(first.value().previewDirection, "ltr");
  assert.equal(second.value().previewDirection, "ttb");
  assert.equal(second.value().scrollTtbScale, "fill");
  assert.deepEqual(changes, ["ltr"]);
  assert.notEqual(
    first.value().portraitControls,
    second.value().portraitControls,
  );
});

test("thumbnail cache requests logical pages, deduplicates and aborts on dispose", async () => {
  const requests = [];
  let release;
  let signal;
  const source = {
    totalPages: 45,
    initialPreviewItems: [{ pageNum: 1 }],
    getPreviewItems: (pages, abortSignal) => {
      requests.push(pages);
      signal = abortSignal;
      return new Promise((resolve) => {
        release = () => resolve(pages.map((pageNum) => ({ pageNum })));
      });
    },
  };
  const cache = createPreviewCache(source);
  const first = cache.load(0);
  assert.equal(cache.load(0), first);
  assert.deepEqual(
    requests[0],
    Array.from({ length: 39 }, (_, i) => i + 2),
  );
  release();
  await first;
  assert.equal(cache.item(40).pageNum, 40);
  await cache.load(0);
  assert.equal(requests.length, 1);
  const late = cache.load(1);
  cache.dispose();
  assert.equal(signal.aborted, true);
  release();
  await late;
  assert.equal(cache.item(45), null);
});

test("default surface stack closes preview before selecting in reader", async () => {
  const events = [];
  const stack = new SurfaceStack(
    (surface) => {
      events.push(`close:${surface}`);
    },
    (error) => {
      throw error;
    },
  );
  stack.push("reader");
  stack.push("preview");
  stack.requestClose("preview", () => events.push("select:12"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["close:preview", "select:12"]);
  assert.equal(stack.top, "reader");
  stack.dispose();
});

test("history transport delays closure until pop and closes in reverse order", async () => {
  const events = [];
  let notify;
  const stack = new SurfaceStack(
    async (surface) => {
      events.push(`close:${surface}`);
    },
    (error) => {
      throw error;
    },
    {
      push: (depth, surface) => events.push(`push:${depth}:${surface}`),
      back: (count) => events.push(`back:${count}`),
      subscribe: (callback) => {
        notify = callback;
        return () => events.push("unsubscribe");
      },
    },
  );
  stack.push("reader");
  stack.push("preview");
  assert.equal(stack.requestClose("preview"), true);
  assert.equal(stack.requestClose("preview"), false);
  assert.equal(stack.depth, 2);
  notify(0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [
    "push:1:reader",
    "push:2:preview",
    "back:1",
    "close:preview",
    "close:reader",
  ]);
  assert.equal(stack.depth, 0);
  stack.dispose();
  assert.equal(events.at(-1), "unsubscribe");
});

test("failed mount rolls back only its own history entry", () => {
  const events = [];
  const stack = new SurfaceStack(
    () => events.push("close"),
    (error) => {
      throw error;
    },
    {
      push: () => {},
      back: (count) => events.push(count),
      subscribe: () => () => {},
    },
  );
  stack.push("reader");
  stack.rollbackPush("reader");
  assert.equal(stack.depth, 0);
  assert.deepEqual(events, [1]);
});

test("scroll locks tolerate out-of-order and repeated cleanup", () => {
  const style = (initial, initialPriority = "") => {
    let value = initial;
    let priority = initialPriority;
    return {
      getPropertyValue: () => value,
      getPropertyPriority: () => priority,
      setProperty: (_key, next, nextPriority = "") => {
        value = next;
        priority = nextPriority;
      },
      removeProperty: () => {
        value = "";
        priority = "";
      },
    };
  };
  const htmlStyle = style("auto", "important");
  const bodyStyle = style("");
  globalThis.document = {
    documentElement: { style: htmlStyle },
    body: { style: bodyStyle },
  };
  const reader = lockPageScroll();
  const preview = lockPageScroll();
  reader();
  reader();
  assert.equal(htmlStyle.getPropertyValue(), "hidden");
  preview();
  assert.equal(htmlStyle.getPropertyValue(), "auto");
  assert.equal(htmlStyle.getPropertyPriority(), "important");
  assert.equal(bodyStyle.getPropertyValue(), "");
  delete globalThis.document;
});

test("overlapping close requests preserve async surface teardown order", async () => {
  const events = [];
  let finishPreview;
  const stack = new SurfaceStack(
    (surface) => {
      events.push(surface);
      if (surface === "preview")
        return new Promise((resolve) => {
          finishPreview = resolve;
        });
    },
    (error) => {
      throw error;
    },
  );
  stack.push("reader");
  stack.push("preview");
  const first = stack.closeToDepth(1);
  const second = stack.closeToDepth(0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["preview"]);
  finishPreview();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["preview", "reader"]);
  assert.equal(stack.depth, 0);
});

test("reader source has no client imports or persistence calls", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    });
  for (const file of walk(path.join(root, "src")).filter((file) =>
    /\.tsx?$/.test(file),
  )) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /\b(?:GM|localStorage|sessionStorage)\b|window\.history/,
      file,
    );
    for (const match of source.matchAll(
      /(?:from\s+|import\s*)["']([^"']+)["']/g,
    )) {
      const dependency = match[1];
      if (dependency.startsWith(".")) {
        assert.ok(
          path.resolve(path.dirname(file), dependency).startsWith(root),
          file,
        );
      } else {
        assert.match(
          dependency,
          /^(?:solid-js(?:\/|$)|lucide-solid(?:\/|$)|reader:)/,
          file,
        );
      }
    }
  }
});
