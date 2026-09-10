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
  await loadModule("features/ReadProgressSyncer");
const { createReaderSettings } = await loadModule("features/ReaderSettings");
const { createPreviewCache } = await loadModule("features/PreviewCache");
const { ReaderPreviewNavi } = await loadModule("features/ReaderPreviewNavi");
const { lockPageScroll } = await loadModule("features/Viewport");
const readerLayout = await loadModule("Reader/layout");
const previewLayout = await loadModule("ScrollPreview/layout");
const preview2Layout = await loadModule("ScrollPreview2/layout");
const { ReaderImages } = await loadModule("Reader/images");
const { ReaderSession } = await loadModule("Reader/session");

test("Reader navigation owns alignment and direction without aligning viewport observations", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: 800, innerHeight: 600 };
  let session;
  try {
    session = new ReaderSession({ initialPageNum: 4, totalPages: 8 }, {
      controls: () => ({ navigationMode: "paged", pagedDirection: "rtl", pageLayout: "double", rightTapAction: "previous" }),
      value: () => ({ scrollTtbScale: "fill", scrollHorizontalScale: "fill" }),
    });
    const { navi, ctrls } = session.state;
    assert.equal(navi.currentPageNum(), 3);
    assert.equal(navi.normalizePage(4), 3);
    assert.equal(navi.normalizePage(9), 9);
    assert.equal(navi.readerPageLimit(), 9);
    assert.equal(navi.progressPageLimit(), 8);
    assert.equal(navi.isContentPage(9), false);
    assert.equal(navi.isContentPage(8), true);
    navi.updatePage(4);
    assert.equal(navi.currentPageNum(), 4);
    assert.equal(navi.direction(), 1);
    navi.updatePage(2);
    assert.equal(navi.direction(), -1);
    navi.updatePage(2);
    assert.equal(navi.direction(), -1);
    ctrls.update({ ...ctrls.value(), firstPageSeparate: true });
    assert.equal(navi.normalizePage(1), 1);
    assert.equal(navi.normalizePage(3), 2);
    ctrls.update({ ...ctrls.value(), navigationMode: "scroll" });
    assert.equal(navi.normalizePage(3), 3);
  } finally {
    session?.dispose();
    globalThis.window = previousWindow;
  }
});

test("layout calculations retain page windows, median sizing and group offsets", () => {
  assert.deepEqual(readerLayout.pageWindowNumbers(3, 2), [1, 2, 3, 4, 5]);
  assert.equal(readerLayout.containFitScale(200, 400, 100, 300), 0.5);
  assert.deepEqual(readerLayout.containFitFrame(2, 100, 300), { width: 100, height: 200 });
  const frame = {
    aspectRatio: 1.5, contentPage: true, viewportWidth: 800, viewportHeight: 600,
    navigationMode: "paged", pageLayout: "double", sizeScale: "fill",
    reference: null, referenceAspectRatio: 1.5, horizontal: false,
  };
  assert.deepEqual(readerLayout.pageFrameSize(frame), { width: 398.5, height: 597.75 });
  assert.deepEqual(readerLayout.pageFrameSize({ ...frame, navigationMode: "scroll", aspectRatio: 2 }),
    { width: 800, height: 1600 });
  assert.equal(previewLayout.medianSize([10, 30, 20, 100], 1), 25);
  assert.equal(previewLayout.medianSize([], 17), 17);
  const geometry = previewLayout.buildGroupGeometry({
    crossCount: 2,
    estimatedAspectRatio: 2,
    gap: 8,
    horizontal: false,
    item: () => null,
    itemScaleLimit: 1,
    tileCrossSize: 100,
    totalImages: 5,
  });
  assert.deepEqual(geometry.groupOffsets, [0, 208, 416]);
  assert.equal(geometry.totalMainSize, 616);
  const layout = { ...geometry, gap: 8 };
  assert.equal(previewLayout.groupAtOffset(layout, 208), 1);
  assert.equal(previewLayout.logicalGroupOffset(layout, 260), 1.25);
  assert.equal(previewLayout.physicalGroupOffset(layout, 1.25), 260);
});

test("Reader image resources retain metadata, touch LRU entries and abort on disposal", async () => {
  let requestSignal;
  let requests = 0;
  const images = new ReaderImages({
    loadImage: async (_page, signal) => {
      requests++;
      requestSignal = signal;
      return { imageUrl: "/image", width: 200, height: 300 };
    },
  });
  const target = { pageNum: 1, page: { url: "/page", aspectRatio: 1.5 } };
  const loaded = await images.load(target);
  images.remember(1, loaded);
  assert.equal((await images.load(target)).imageUrl, "/image");
  assert.equal(requests, 1);
  for (let page = 2; page <= 160; page++) images.remember(page, loaded);
  images.touch(1);
  images.remember(161, loaded);
  assert.ok(images.get(1));
  assert.equal(images.get(2), undefined);
  assert.equal(requestSignal.aborted, false);
  images.dispose();
  assert.equal(requestSignal.aborted, true);
});

test("preview sizing distinguishes horizontal rows, vertical columns and explicit zoom", () => {
  const options = {
    width: 800, height: 600, horizontal: false, embedded: false,
    totalImages: 8, pixelScale: 1, gap: 8, estimatedAspectRatio: 1.5,
    maxTileWidth: 220, embeddedReferenceTileWidth: 160,
    referenceThumbnailCrossSize: 200, crossCountOverride: null,
    maximumCrossCount: 12, item: () => null,
  };
  const vertical = previewLayout.calculatePreviewLayout(options);
  assert.equal(vertical.crossCount, 4);
  assert.equal(vertical.tileCrossSize, 194);
  assert.equal(vertical.totalMainSize, 590);
  const horizontal = previewLayout.calculatePreviewLayout({ ...options, horizontal: true });
  assert.equal(horizontal.crossCount, 2);
  assert.equal(horizontal.tileCrossSize, 291);
  assert.equal(horizontal.totalMainSize, 800);
  const zoomed = previewLayout.calculatePreviewLayout({ ...options, crossCountOverride: 1 });
  assert.equal(zoomed.crossCount, 1);
  assert.equal(zoomed.tileCrossSize, 400);
  assert.equal(zoomed.viewportHeight, 600);
  assert.equal(previewLayout.minimumPreviewCrossCount(false, 1.5, 800, 600, 8), 2);
});

test("embedded preview sizing uses reference thumbnails and preserves override limits", () => {
  const options = {
    width: 800, height: 600, horizontal: false, embedded: true,
    totalImages: 8, pixelScale: 1, gap: 8, estimatedAspectRatio: 1.5,
    maxTileWidth: 220, embeddedReferenceTileWidth: 160,
    referenceThumbnailCrossSize: 160, crossCountOverride: null,
    maximumCrossCount: 12, item: () => null,
  };
  assert.equal(previewLayout.calculatePreviewLayout(options).crossCount, 5);
  assert.equal(previewLayout.calculatePreviewLayout({ ...options, crossCountOverride: 30 }).crossCount, 12);
  assert.equal(previewLayout.calculatePreviewLayout({ ...options, crossCountOverride: 0 }).crossCount, 1);
});

test("ScrollPreview2 sizing is container-driven and caps initial overrides", () => {
  const options = {
    width: 500, height: 300, horizontal: false,
    totalImages: 20, pixelScale: 1, gap: 8, estimatedAspectRatio: 1.5,
    maxTileWidth: 220, referenceThumbnailCrossSize: 200,
    crossCountOverride: 30, maximumCrossCount: 3, item: () => null,
  };
  const layout = preview2Layout.calculatePreviewLayout(options);
  assert.equal(layout.crossCount, 3);
  assert.equal(
    preview2Layout.calculatePreviewLayout({ ...options, crossCountOverride: null }).crossCount,
    3,
  );
  const placements = preview2Layout.previewTilePlacements({
    layout, firstGroup: 0, lastGroup: 0, totalPages: 20, rightToLeft: false,
  });
  assert.deepEqual(placements.map(tile => tile.pageNum), [1, 2, 3]);
  assert.deepEqual(
    preview2Layout.previewVisiblePages(layout, 0, 20),
    { first: 1, last: 6 },
  );
});

test("Reader decode admission retains its minimum concurrency and releases waiting work", async () => {
  const images = new ReaderImages({});
  const releases = await Promise.all(Array.from({ length: 3 }, () => images.reserveDecode(null)));
  let admitted = false;
  const waiting = images.reserveDecode(null).then((release) => {
    admitted = true;
    return release;
  });
  await Promise.resolve();
  assert.equal(admitted, false);
  releases[0]();
  const releaseWaiting = await waiting;
  for (const release of releases) release();
  releaseWaiting();
  images.dispose();
});

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



function navigationFixture(overrides = {}) {
  let top = null;
  const events = [];
  const navi = ReaderPreviewNavi({
    top: () => top,
    previewMode: () => "embedded",
    openReader: async (page, fullscreen) => { events.push(["read", page, fullscreen]); },
    openPreview: (page, mode) => events.push(["preview", page, mode]),
    focusPreview: page => events.push(["focus", page]),
    closePreview: async returning => { events.push(["close-preview", returning]); },
    closeReader: async () => { events.push(["close-reader"]); },
    onError: error => { events.push(["error", error.message]); },
    ...overrides,
  });
  return { navi, events, getTop: () => top, setTop: value => { top = value; } };
}

test("ReaderPreviewNavi routes back by the supplied top panel without owning view state", () => {
  const { navi, events, getTop, setTop } = navigationFixture();
  assert.equal(navi.back(), false);
  for (const top of ["reader", "overlay-preview", "embedded-preview"]) {
    setTop(top);
    assert.equal(getTop(), top);
    assert.equal(navi.back(), true);
    assert.equal(getTop(), top);
  }
  assert.deepEqual(events, [["close-reader"], ["close-preview", true], ["close-preview", true]]);
  assert.deepEqual(Object.keys(navi).sort(), ["back", "closeAll", "openPreview", "openReader"]);
});

test("ReaderPreviewNavi waits for Preview to close before reading the selected page", async () => {
  let finishClose;
  const { navi, events, setTop } = navigationFixture({
    closePreview: returning => {
      assert.equal(returning, false);
      return new Promise(resolve => { finishClose = resolve; });
    },
  });
  setTop("overlay-preview");
  const opening = navi.openReader(12, true);
  assert.deepEqual(events, []);
  finishClose();
  await opening;
  assert.deepEqual(events, [["read", 12, true]]);
});

test("ReaderPreviewNavi navigates directly when Reader is already on top", async () => {
  const { navi, events, getTop, setTop } = navigationFixture();
  setTop("reader");
  await navi.openReader(7);
  assert.deepEqual(events, [["read", 7, false]]);
  assert.equal(getTop(), "reader");
});

test("ReaderPreviewNavi distinguishes Reader's Preview button from Preview enlargement", () => {
  const { navi, events } = navigationFixture();
  navi.openPreview(7, true);
  navi.openPreview(7);
  assert.deepEqual(events, [["focus", 7], ["preview", 7, "embedded"], ["preview", 7, "overlay"]]);
  const overlay = navigationFixture({ previewMode: () => "overlay" });
  overlay.navi.openPreview(9, true);
  assert.deepEqual(overlay.events, [["focus", 9], ["preview", 9, "overlay"]]);
});

test("ReaderPreviewNavi forwards opening failures and delegates whole-session closure", async () => {
  const { navi, events, setTop } = navigationFixture({
    openReader: async () => { throw new Error("opening failed"); },
    closeReader: async () => { throw new Error("closing failed"); },
  });
  await assert.rejects(navi.openReader(3), /opening failed/);
  setTop("overlay-preview");
  navi.closeAll();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, [["error", "closing failed"]]);
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
