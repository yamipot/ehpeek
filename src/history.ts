const HISTORY_KEY_PREFIX = "ehpeek:history:";
const HISTORY_COUNT_KEY = "ehpeek:history-count";
const HISTORY_LIMIT = 2_000;
const HISTORY_PRUNE_COUNT = 1_000;
const SAVE_DELAY_MS = 10_000;

export type ReaderHistoryRecord = {
  galleryId: number;
  token: string;
  galleryUrl: string;
  pageNum: number;
  totalPages?: number;
  updatedAt: number;
};

export class ReaderHistorySession {
  private pending: ReaderHistoryRecord | null = null;
  private lastSaved: ReaderHistoryRecord | null = null;
  private timer: number | null = null;

  constructor(private readonly baseRecord: Omit<ReaderHistoryRecord, "pageNum" | "updatedAt">) {
    window.addEventListener("pagehide", this.flush);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  update(pageNum: number | undefined, totalPages?: number): void {
    if (!pageNum || pageNum <= 0) {
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
      saveReaderHistory(this.pending);
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

  private sameProgress(left: ReaderHistoryRecord | null, right: ReaderHistoryRecord | null): boolean {
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

export function loadReaderHistory(galleryId: number, token: string): ReaderHistoryRecord | null {
  return GM_getValue<ReaderHistoryRecord | null>(historyKey(galleryId, token), null);
}

function saveReaderHistory(record: ReaderHistoryRecord): void {
  const key = historyKey(record.galleryId, record.token);
  const exists = GM_getValue<ReaderHistoryRecord | null>(key, null) !== null;

  GM_setValue(key, record);

  if (!exists) {
    const count = GM_getValue(HISTORY_COUNT_KEY, 0) + 1;
    GM_setValue(HISTORY_COUNT_KEY, count);

    if (count > HISTORY_LIMIT) {
      pruneReaderHistory();
    }
  }
}

function historyKey(galleryId: number, token: string): string {
  return `${HISTORY_KEY_PREFIX}${galleryId}:${token}`;
}

function pruneReaderHistory(): void {
  const records = GM_listValues()
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .map((key) => ({ key, record: GM_getValue<ReaderHistoryRecord | null>(key, null) }))
    .filter((entry): entry is { key: string; record: ReaderHistoryRecord } => entry.record !== null)
    .sort((left, right) => left.record.updatedAt - right.record.updatedAt);

  for (const entry of records.slice(0, HISTORY_PRUNE_COUNT)) {
    GM_deleteValue(entry.key);
  }

  GM_setValue(HISTORY_COUNT_KEY, Math.max(0, records.length - HISTORY_PRUNE_COUNT));
}
