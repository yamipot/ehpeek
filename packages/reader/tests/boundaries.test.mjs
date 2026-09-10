import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

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

const { createReaderSettings } = await loadModule("features/ReaderSettings");
const { createPreviewCache } = await loadModule("features/PreviewCache");
const { ReaderPreviewNavi } = await loadModule("features/ReaderPreviewNavi");
const { lockPageScroll } = await loadModule("features/Viewport");
const readerLayout = await loadModule("Reader/layout");
const previewLayout = await loadModule("ScrollPreview/layout");
const { ReaderImages } = await loadModule("Reader/images");
test("Reader alignment preserves cover pairs and the end screen", () => {
  const { normalizeReadingPage: normalize, nextReadingPage: next } = readerLayout;
  assert.equal(normalize(4, 8, "paged", "double", false), 3);
  assert.equal(normalize(9, 8, "paged", "double", false), 9);
  assert.equal(normalize(3, 8, "paged", "double", true), 2);
  assert.equal(normalize(1, 8, "paged", "double", true), 1);
  assert.equal(normalize(3, 8, "scroll", "double", true), 3);
  assert.equal(next(1, 1, 8, "double", true), 2);
  assert.equal(next(2, -1, 8, "double", true), 1);
  assert.equal(next(9, -1, 8, "double", true), 8);
  assert.equal(next(9, -1, 8, "double", false), 7);
  assert.equal(next(7, 1, 8, "double", false), 9);
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
  assert.equal(previewLayout.groupAtOffset(geometry, 208), 1);
  assert.equal(previewLayout.groupOffsetAt(geometry, 2), 416);
  assert.equal(previewLayout.groupSizeAt(geometry, 1), 200);
  assert.equal(previewLayout.logicalGroupOffset(geometry, 260), 1.25);
  assert.equal(previewLayout.physicalGroupOffset(geometry, 1.25), 260);
});

test("Reader reuses loaded image metadata and aborts source requests on disposal", async () => {
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
  assert.equal(requestSignal.aborted, false);
  images.dispose();
  assert.equal(requestSignal.aborted, true);
});

test("preview sizing distinguishes horizontal rows, vertical columns and explicit zoom", () => {
  const options = {
    width: 800, height: 600, horizontal: false,
    totalImages: 8, pixelScale: 1, gap: 8, estimatedAspectRatio: 1.5,
    maxTileWidth: 220,
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

test("ScrollPreview sizing is container-driven and caps initial overrides", () => {
  const options = {
    width: 500, height: 300, horizontal: false,
    totalImages: 20, pixelScale: 1, gap: 8, estimatedAspectRatio: 1.5,
    maxTileWidth: 220, referenceThumbnailCrossSize: 200,
    crossCountOverride: 30, maximumCrossCount: 3, item: () => null,
  };
  const layout = previewLayout.calculatePreviewLayout(options);
  assert.equal(layout.crossCount, 3);
  assert.equal(
    previewLayout.calculatePreviewLayout({ ...options, crossCountOverride: null }).crossCount,
    3,
  );
  const placements = previewLayout.previewTilePlacements({
    layout, firstGroup: 0, lastGroup: 0, totalPages: 20, rightToLeft: false,
  });
  assert.deepEqual(placements.map(tile => tile.pageNum), [1, 2, 3]);
  assert.deepEqual(
    previewLayout.previewVisiblePages(layout, 0, 20),
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

test("settings are isolated per instance and notify only subscribed keys", () => {
  const changes = [];
  const first = createReaderSettings(
    {},
    { previewDirection: (value) => changes.push(value) },
  );
  const second = createReaderSettings();
  first.previewDirection.set("ltr");
  first.previewDirection.set("ltr");
  first.scrollTtbScale.set(2);
  assert.equal(first.previewDirection.value(), "ltr");
  assert.equal(second.previewDirection.value(), "ttb");
  assert.equal(second.scrollTtbScale.value(), "fill");
  assert.deepEqual(changes, ["ltr"]);
});

test("orientation fields notify snapshots without changing other preferences", () => {
  const changes = [];
  const settings = createReaderSettings({ scrollTtbScale: null }, {
    portraitControls: value => changes.push(value),
    landscapeControls: () => assert.fail("portrait edits must not notify landscape"),
  });
  const portrait = settings.portraitControls;
  portrait.pagedDirection.set("ltr");
  portrait.pagedDirection.set("ltr");
  portrait.navigationMode.set("paged");
  assert.deepEqual(changes, [
    { navigationMode: "scroll", scrollDirection: "ttb", pagedDirection: "ltr", pageLayout: "single", rightTapAction: "previous" },
    { navigationMode: "paged", scrollDirection: "ttb", pagedDirection: "ltr", pageLayout: "single", rightTapAction: "previous" },
  ]);
  assert.equal(portrait.scrollDirection.value(), "ttb");
  assert.equal(settings.landscapeControls.pagedDirection.value(), "rtl");
  assert.equal(settings.landscapeControls.navigationMode.value(), "scroll");
  assert.equal(settings.scrollTtbScale.value(), null);
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
  return { navi, events, setTop: value => { top = value; } };
}

test("Back closes the top panel and is ignored when nothing is open", () => {
  const { navi, events, setTop } = navigationFixture();
  assert.equal(navi.back(), false);
  for (const top of ["reader", "overlay-preview", "embedded-preview"]) {
    setTop(top);
    assert.equal(navi.back(), true);
  }
  assert.deepEqual(events, [["close-reader"], ["close-preview", true], ["close-preview", true]]);
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
  const { navi, events, setTop } = navigationFixture();
  setTop("reader");
  await navi.openReader(7);
  assert.deepEqual(events, [["read", 7, false]]);
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
