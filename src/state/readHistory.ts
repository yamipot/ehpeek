import { state } from "./index";
import type { GalleryHistoryInfo } from "../eh/types";
import { createSignal, type Accessor, type Setter } from "solid-js";

const HISTORY_KEY_PREFIX = "ehpeek:history:";
const HISTORY_QUEUE_KEY_PREFIX = "ehpeek:hist_q:";
export const READ_HISTORY_LIMIT = 3_000;
const HISTORY_COMPACT_THRESHOLD = 4_000;
const SAVE_DELAY_MS = 10_000;
const READ_HISTORY_ARCHIVE_TYPE = "ehpeek-read-history";
const READ_HISTORY_ARCHIVE_VERSION = 1;

export type ReadHistoryRecord = {
  galleryId: number;
  gallery?: GalleryHistoryInfo;
  token: string;
  pageNum: number;
  totalPages?: number;
  updatedAt: number;
};

export type ReadingProgress = {
  currentPage: number;
  hasHistory: boolean;
  totalPages: number | null;
};

type StoredReadHistoryRecord = ReadHistoryRecord & {
  queueOrder: string;
};

type ReadHistoryArchiveGallery = GalleryHistoryInfo;

type ReadHistoryArchiveRecord = {
  galleryId: number;
  gallery?: ReadHistoryArchiveGallery;
  pageNum: number;
  token: string;
  totalPages?: number;
  updatedAt: number;
};

type ReadHistoryArchive = {
  type: typeof READ_HISTORY_ARCHIVE_TYPE;
  version: typeof READ_HISTORY_ARCHIVE_VERSION;
  records: ReadHistoryArchiveRecord[];
};

export class ReadingProgressSession {
  readonly progress: Accessor<ReadingProgress>;
  private readonly setProgress: Setter<ReadingProgress>;
  private pending: ReadHistoryRecord | null = null;
  private lastSaved: ReadHistoryRecord | null = null;
  private timer: number | null = null;

  constructor(
    private readonly baseRecord: Omit<ReadHistoryRecord, "pageNum" | "updatedAt"> | null,
    initial: ReadingProgress,
  ) {
    const [progress, setProgress] = createSignal(initial);
    this.progress = progress;
    this.setProgress = setProgress;
    window.addEventListener("pagehide", this.flush);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  update(pageNum: number | undefined, totalPages?: number): void {
    if (!pageNum || pageNum <= 0) {
      return;
    }

    this.setProgress({
      currentPage: pageNum,
      hasHistory: this.baseRecord !== null,
      totalPages: totalPages ?? this.progress().totalPages,
    });
    if (!this.baseRecord) {
      return;
    }

    const nextRecord = {
      ...this.baseRecord,
      pageNum,
      totalPages,
      updatedAt: Date.now(),
    };

    if (this.sameProgress(nextRecord, this.lastSaved)) {
      return;
    }

    this.pending = nextRecord;
    this.schedule();
  }

  flush = (): void => {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.pending) {
      return;
    }

    if (!this.sameProgress(this.pending, this.lastSaved)) {
      saveReadHistory(this.pending);
      this.lastSaved = this.pending;
    }

    this.pending = null;
  };

  dispose(): void {
    this.flush();
    window.removeEventListener("pagehide", this.flush);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private schedule(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = window.setTimeout(this.flush, SAVE_DELAY_MS);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.flush();
    }
  };

  private sameProgress(left: ReadHistoryRecord | null, right: ReadHistoryRecord | null): boolean {
    return Boolean(
      left &&
        right &&
        left.galleryId === right.galleryId &&
        left.token === right.token &&
        left.pageNum === right.pageNum &&
        left.totalPages === right.totalPages,
    );
  }
}

export function loadReadHistory(galleryId: number, token: string): ReadHistoryRecord | null {
  return GM_getValue<StoredReadHistoryRecord | null>(historyKey(galleryId, token), null);
}

export function loadReadHistoryRecords(): ReadHistoryRecord[] {
  return GM_listValues()
    .filter((key) => key.startsWith(HISTORY_QUEUE_KEY_PREFIX))
    .sort((left, right) => right.localeCompare(left))
    .map((key) => {
      const reference = GM_getValue<string | null>(key, null);
      if (!reference) {
        return null;
      }

      const record = GM_getValue<StoredReadHistoryRecord | null>(
        `${HISTORY_KEY_PREFIX}${reference}`,
        null,
      );
      return record?.queueOrder === queueOrderFromKey(key) ? record : null;
    })
    .filter((record): record is StoredReadHistoryRecord => record !== null);
}

export function exportReadHistory(): string {
  const archive: ReadHistoryArchive = {
    type: READ_HISTORY_ARCHIVE_TYPE,
    version: READ_HISTORY_ARCHIVE_VERSION,
    records: loadReadHistoryRecords().map((record) => ({
      galleryId: record.galleryId,
      gallery: mergeGalleryInfo(undefined, record.gallery),
      pageNum: record.pageNum,
      token: record.token,
      totalPages: record.totalPages,
      updatedAt: record.updatedAt,
    })),
  };
  return JSON.stringify(archive, null, 2);
}

export function importReadHistory(source: string): number {
  const archive = parseReadHistoryArchive(JSON.parse(source) as unknown);
  const imported = new Map<string, ReadHistoryRecord>();

  for (const archived of archive.records) {
    const record = archiveRecordToHistory(archived);
    const reference = historyReference(record.galleryId, record.token);
    const previous = imported.get(reference);
    if (!previous) {
      imported.set(reference, record);
      continue;
    }
    const newer = record.updatedAt >= previous.updatedAt ? record : previous;
    const older = newer === record ? previous : record;
    imported.set(reference, {
      ...newer,
      gallery: mergeGalleryInfo(older.gallery, newer.gallery),
    });
  }

  for (const [reference, record] of imported) {
    const key = `${HISTORY_KEY_PREFIX}${reference}`;
    const previous = GM_getValue<StoredReadHistoryRecord | null>(key, null);
    const importedIsNewer = !previous || record.updatedAt >= previous.updatedAt;
    const retained = importedIsNewer ? record : previous;
    GM_setValue(key, {
      ...retained,
      gallery: importedIsNewer
        ? mergeGalleryInfo(previous?.gallery, record.gallery)
        : mergeGalleryInfo(record.gallery, previous.gallery),
      queueOrder: previous?.queueOrder ?? "",
    });
  }

  pruneReadHistory();
  return Math.min(imported.size, READ_HISTORY_LIMIT);
}

export function clearReadHistory(): void {
  for (const key of GM_listValues()) {
    if (key.startsWith(HISTORY_KEY_PREFIX) || key.startsWith(HISTORY_QUEUE_KEY_PREFIX)) {
      GM_deleteValue(key);
    }
  }
  state.gallery.readHistoryCount.set(0);
}

export function removeReadHistory(galleryId: number, token: string): void {
  const key = historyKey(galleryId, token);
  const record = GM_getValue<StoredReadHistoryRecord | null>(key, null);
  if (!record) {
    return;
  }

  GM_deleteValue(key);
  GM_deleteValue(queueKey(record.queueOrder));
  state.gallery.readHistoryCount.set(
    Math.max(0, state.gallery.readHistoryCount.reload() - 1),
  );
}

export function updateReadHistoryGalleryInfo(
  galleryId: number,
  token: string,
  gallery: GalleryHistoryInfo,
): ReadHistoryRecord | null {
  const record = loadReadHistory(galleryId, token);
  if (!record) {
    return null;
  }
  const updated = {
    ...record,
    gallery: mergeGalleryInfo(record.gallery, gallery),
  };
  GM_setValue(historyKey(galleryId, token), updated);
  return updated;
}

export function recordGalleryVisit(
  galleryId: number,
  token: string,
  totalPages: number,
  gallery: GalleryHistoryInfo,
): ReadHistoryRecord {
  const existing = loadReadHistory(galleryId, token);
  const record = existing
    ? {
      ...existing,
      gallery: mergeGalleryInfo(existing.gallery, gallery),
      totalPages,
      updatedAt: Date.now(),
    }
    : {
      gallery,
      galleryId,
      pageNum: -1,
      token,
      totalPages,
      updatedAt: Date.now(),
    };
  saveReadHistory(record);
  return record;
}

function saveReadHistory(record: ReadHistoryRecord): void {
  const key = historyKey(record.galleryId, record.token);
  const previous = GM_getValue<StoredReadHistoryRecord | null>(key, null);
  const exists = previous !== null;
  const queueOrder = createQueueOrder(record);

  GM_setValue(key, {
    ...record,
    gallery: mergeGalleryInfo(previous?.gallery, record.gallery),
    queueOrder,
  });
  GM_setValue(queueKey(queueOrder), historyReference(record.galleryId, record.token));

  if (!exists) {
    const count = state.gallery.readHistoryCount.reload() + 1;
    state.gallery.readHistoryCount.set(count);

    if (count >= HISTORY_COMPACT_THRESHOLD) {
      pruneReadHistory();
    }
  }
}

function mergeGalleryInfo(
  previous: GalleryHistoryInfo | undefined,
  current: GalleryHistoryInfo | undefined,
): GalleryHistoryInfo | undefined {
  const merged = {
    category: current?.category ?? previous?.category,
    categoryClass: current?.categoryClass ?? previous?.categoryClass,
    coverUrl: current?.coverUrl ?? previous?.coverUrl,
    language: current?.language ?? previous?.language,
    postedAt: current?.postedAt ??
      (typeof previous?.postedAt === "number" ? previous.postedAt : undefined),
    rating: current?.rating ?? (typeof previous?.rating === "number" ? previous.rating : undefined),
    title: current?.title ?? previous?.title,
    titleSub: current?.titleSub ?? previous?.titleSub,
    uploader: current?.uploader ?? previous?.uploader,
  };
  const entries = Object.entries(merged).filter((entry) => entry[1] !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) as GalleryHistoryInfo : undefined;
}

function parseReadHistoryArchive(source: unknown): ReadHistoryArchive {
  if (
    !isRecord(source) ||
    source.type !== READ_HISTORY_ARCHIVE_TYPE ||
    source.version !== READ_HISTORY_ARCHIVE_VERSION ||
    !Array.isArray(source.records)
  ) {
    throw new Error("Invalid EhPeek history archive.");
  }

  return {
    type: READ_HISTORY_ARCHIVE_TYPE,
    version: READ_HISTORY_ARCHIVE_VERSION,
    records: source.records.map(parseReadHistoryRecord),
  };
}

function parseReadHistoryRecord(source: unknown): ReadHistoryArchiveRecord {
  if (
    !isRecord(source) ||
    !Number.isSafeInteger(source.galleryId) ||
    (source.galleryId as number) <= 0 ||
    typeof source.token !== "string" ||
    source.token.length === 0 ||
    !Number.isSafeInteger(source.pageNum) ||
    (source.pageNum as number) < -1 ||
    typeof source.updatedAt !== "number" ||
    !Number.isFinite(source.updatedAt) ||
    source.updatedAt <= 0 ||
    (
      source.totalPages !== undefined &&
      (!Number.isSafeInteger(source.totalPages) || (source.totalPages as number) <= 0)
    )
  ) {
    throw new Error("Invalid EhPeek history record.");
  }

  return {
    galleryId: source.galleryId as number,
    gallery: parseArchiveGallery(source.gallery),
    pageNum: source.pageNum as number,
    token: source.token,
    totalPages: source.totalPages as number | undefined,
    updatedAt: source.updatedAt,
  };
}

function archiveRecordToHistory(source: ReadHistoryArchiveRecord): ReadHistoryRecord {
  return {
    galleryId: source.galleryId,
    gallery: source.gallery,
    pageNum: source.pageNum,
    token: source.token,
    totalPages: source.totalPages,
    updatedAt: source.updatedAt,
  };
}

function parseArchiveGallery(source: unknown): ReadHistoryArchiveGallery | undefined {
  if (source === undefined) {
    return undefined;
  }
  if (!isRecord(source)) {
    throw new Error("Invalid gallery information in EhPeek history archive.");
  }
  const gallery = {
    category: optionalString(source, "category"),
    categoryClass: optionalString(source, "categoryClass"),
    coverUrl: optionalString(source, "coverUrl"),
    language: optionalString(source, "language"),
    postedAt: optionalPositiveNumber(source, "postedAt"),
    rating: optionalNumber(source, "rating"),
    title: optionalString(source, "title"),
    titleSub: optionalString(source, "titleSub"),
    uploader: optionalString(source, "uploader"),
  };
  return Object.values(gallery).some((value) => value !== undefined)
    ? gallery
    : undefined;
}

function optionalString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  if (value !== undefined && typeof value !== "string") {
    throw new Error("Invalid EhPeek history record.");
  }
  return value;
}

function optionalNumber(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = source[key];
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error("Invalid EhPeek history record.");
  }
  return value;
}

function optionalPositiveNumber(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = optionalNumber(source, key);
  if (value !== undefined && value <= 0) {
    throw new Error("Invalid EhPeek history record.");
  }
  return value;
}

function isRecord(source: unknown): source is Record<string, unknown> {
  return typeof source === "object" && source !== null && !Array.isArray(source);
}

function historyKey(galleryId: number, token: string): string {
  return `${HISTORY_KEY_PREFIX}${historyReference(galleryId, token)}`;
}

function pruneReadHistory(): void {
  const keys = GM_listValues();
  const queueKeys = keys.filter((key) => key.startsWith(HISTORY_QUEUE_KEY_PREFIX));
  const records = keys
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .map((key) => ({ key, record: GM_getValue<StoredReadHistoryRecord | null>(key, null) }))
    .filter((entry): entry is { key: string; record: StoredReadHistoryRecord } =>
      entry.record !== null,
    )
    .sort((left, right) => right.record.updatedAt - left.record.updatedAt);
  const retained = records.slice(0, READ_HISTORY_LIMIT);

  for (const entry of records.slice(retained.length)) {
    GM_deleteValue(entry.key);
  }

  retained.forEach((entry) => {
    const queueOrder = createQueueOrder(entry.record);
    const record = { ...entry.record, queueOrder };
    GM_setValue(entry.key, record);
    GM_setValue(
      queueKey(queueOrder),
      historyReference(record.galleryId, record.token),
    );
  });

  for (const key of queueKeys) {
    const reference = GM_getValue<string | null>(key, null);
    const record = reference
      ? GM_getValue<StoredReadHistoryRecord | null>(`${HISTORY_KEY_PREFIX}${reference}`, null)
      : null;
    if (!record || queueKey(record.queueOrder) !== key) {
      GM_deleteValue(key);
    }
  }

  state.gallery.readHistoryCount.set(retained.length);
}

function historyReference(galleryId: number, token: string): string {
  return `${galleryId}:${token}`;
}

function queueKey(order: string): string {
  return `${HISTORY_QUEUE_KEY_PREFIX}${order}`;
}

function queueOrderFromKey(key: string): string {
  return key.slice(HISTORY_QUEUE_KEY_PREFIX.length);
}

function createQueueOrder(
  record: Pick<ReadHistoryRecord, "galleryId" | "updatedAt">,
): string {
  return `${record.updatedAt}-${record.galleryId}`;
}
