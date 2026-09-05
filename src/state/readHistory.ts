import {
  persisted,
  state,
  type PersistedGMStoreValue,
} from "./index";
import type { GalleryHistoryInfo } from "../eh/types";

const HISTORY_KEY_PREFIX = "ehpeek:history:";
const HISTORY_QUEUE_KEY_PREFIX = "ehpeek:hist_q:";
export const READ_HISTORY_LIMIT = 3_000;
const HISTORY_COMPACT_THRESHOLD = 4_000;
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

export type DisplayReadHistoryRecord = ReadHistoryRecord & {
  gallery: GalleryHistoryInfo;
};

export class GalleryReadHistory {
  private readonly store: PersistedGMStoreValue<ReadHistoryRecord | null>;

  constructor(
    readonly galleryId: number,
    readonly token: string,
  ) {
    this.store = persisted<ReadHistoryRecord | null>(
      historyKey(galleryId, token),
      null,
    );
  }

  get value(): ReadHistoryRecord | null {
    return this.store.value;
  }

  clear(): Promise<void> {
    return this.store.clear();
  }

  reload(): Promise<ReadHistoryRecord | null> {
    return this.store.reload();
  }

  recordVisit(
    totalPages: number,
    gallery: GalleryHistoryInfo,
  ): ReadHistoryRecord {
    const previous = this.value;
    return this.save(previous
      ? {
        ...previous,
        gallery: mergeGalleryInfo(previous.gallery, gallery),
        totalPages,
        updatedAt: Date.now(),
      }
      : {
        gallery,
        galleryId: this.galleryId,
        pageNum: -1,
        token: this.token,
        totalPages,
        updatedAt: Date.now(),
      });
  }

  save(record: ReadHistoryRecord): ReadHistoryRecord {
    const previous = this.value;
    const exists = previous !== null;
    const saved = previous && previous.updatedAt > record.updatedAt
      ? storedReadHistoryRecord({
        ...previous,
        gallery: mergeGalleryInfo(previous.gallery, record.gallery),
      })
      : storedReadHistoryRecord({
        ...record,
        gallery: mergeGalleryInfo(previous?.gallery, record.gallery),
      });
    this.store.set(saved);

    if (!exists) {
      void incrementReadHistoryEstimate().catch((error: unknown) => {
        console.error("[ehpeek] Failed to update reading history count", error);
      });
    }
    return saved;
  }

  updateGalleryInfo(gallery: GalleryHistoryInfo): ReadHistoryRecord | null {
    const previous = this.value;
    if (!previous) {
      return null;
    }
    return this.save({
      ...previous,
      gallery: mergeGalleryInfo(previous.gallery, gallery),
    });
  }
}

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

export async function galleryReadHistory(
  galleryId: number,
  token: string,
): Promise<GalleryReadHistory> {
  const history = new GalleryReadHistory(galleryId, token);
  await history.reload();
  return history;
}

export async function loadDisplayReadHistoryRecords(): Promise<DisplayReadHistoryRecord[]> {
  const keys = await GM.listValues();
  await clearLegacyHistoryQueue(keys);
  return (await loadAllReadHistoryRecords(keys))
    .filter((record): record is DisplayReadHistoryRecord => record.gallery !== undefined)
    .slice(0, READ_HISTORY_LIMIT);
}

export async function exportReadHistory(): Promise<string> {
  const archive: ReadHistoryArchive = {
    type: READ_HISTORY_ARCHIVE_TYPE,
    version: READ_HISTORY_ARCHIVE_VERSION,
    records: (await loadAllReadHistoryRecords()).map((record) => ({
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

export async function importReadHistory(source: string): Promise<number> {
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

  await Promise.all(Array.from(imported, async ([reference, record]) => {
    const key = `${HISTORY_KEY_PREFIX}${reference}`;
    const previous = await GM.getValue<ReadHistoryRecord | null>(key, null);
    const importedIsNewer = !previous || record.updatedAt >= previous.updatedAt;
    const retained = importedIsNewer ? record : previous;
    await GM.setValue(key, storedReadHistoryRecord({
      ...retained,
      gallery: importedIsNewer
        ? mergeGalleryInfo(previous?.gallery, record.gallery)
        : mergeGalleryInfo(record.gallery, previous.gallery),
    }));
  }));

  await pruneReadHistory();
  return Math.min(imported.size, READ_HISTORY_LIMIT);
}

export async function clearReadHistory(): Promise<void> {
  const keys = await GM.listValues();
  await Promise.all(keys
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX) || key.startsWith(HISTORY_QUEUE_KEY_PREFIX))
    .map((key) => GM.deleteValue(key)));
  state.gallery.readHistoryCompactEstimate.set(0);
}

export async function removeReadHistory(galleryId: number, token: string): Promise<void> {
  const history = await galleryReadHistory(galleryId, token);
  const record = history.value;
  if (!record) {
    return;
  }

  await history.clear();
  state.gallery.readHistoryCompactEstimate.set(
    Math.max(0, (await state.gallery.readHistoryCompactEstimate.reload()) - 1),
  );
}

async function incrementReadHistoryEstimate(): Promise<void> {
  const estimate = (await state.gallery.readHistoryCompactEstimate.reload()) + 1;
  state.gallery.readHistoryCompactEstimate.set(estimate);
  if (estimate >= HISTORY_COMPACT_THRESHOLD) {
    await pruneReadHistory();
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

async function loadAllReadHistoryRecords(keys?: string[]): Promise<ReadHistoryRecord[]> {
  const storageKeys = keys ?? await GM.listValues();
  const records = await Promise.all(storageKeys
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .map((key) => GM.getValue<ReadHistoryRecord | null>(key, null)));
  return records
    .filter((record): record is ReadHistoryRecord => record !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

async function clearLegacyHistoryQueue(keys: string[]): Promise<void> {
  // TODO: Remove this one-time hist_q migration cleanup after existing installs have opened History.
  await Promise.all(keys
    .filter((key) => key.startsWith(HISTORY_QUEUE_KEY_PREFIX))
    .map((key) => GM.deleteValue(key)));
}

async function pruneReadHistory(): Promise<void> {
  const keys = await GM.listValues();
  const records = (await Promise.all(keys
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .map(async (key) => ({
      key,
      record: await GM.getValue<ReadHistoryRecord | null>(key, null),
    }))))
    .filter((entry): entry is { key: string; record: ReadHistoryRecord } =>
      entry.record !== null,
    )
    .sort((left, right) => right.record.updatedAt - left.record.updatedAt);
  const retained = records.slice(0, READ_HISTORY_LIMIT);

  await Promise.all(records.slice(retained.length).map((entry) => GM.deleteValue(entry.key)));

  state.gallery.readHistoryCompactEstimate.set(retained.length);
}

function historyReference(galleryId: number, token: string): string {
  return `${galleryId}:${token}`;
}

function storedReadHistoryRecord(record: ReadHistoryRecord): ReadHistoryRecord {
  return {
    galleryId: record.galleryId,
    gallery: record.gallery,
    token: record.token,
    pageNum: record.pageNum,
    totalPages: record.totalPages,
    updatedAt: record.updatedAt,
  };
}
