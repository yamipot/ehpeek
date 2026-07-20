import { state } from "./index";

const HISTORY_KEY_PREFIX = "ehpeek:history:";
const HISTORY_LIMIT = 2_000;
const HISTORY_PRUNE_COUNT = 1_000;
const SAVE_DELAY_MS = 10_000;

type ReadHistoryRecord = {
  galleryId: number;
  token: string;
  pageNum: number;
  totalPages?: number;
  updatedAt: number;
};

export class ReadHistorySession {
  private pending: ReadHistoryRecord | null = null;
  private lastSaved: ReadHistoryRecord | null = null;
  private timer: number | null = null;

  constructor(private readonly baseRecord: Omit<ReadHistoryRecord, "pageNum" | "updatedAt">) {
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
  return GM_getValue<ReadHistoryRecord | null>(historyKey(galleryId, token), null);
}

function saveReadHistory(record: ReadHistoryRecord): void {
  const key = historyKey(record.galleryId, record.token);
  const exists = GM_getValue<ReadHistoryRecord | null>(key, null) !== null;

  GM_setValue(key, record);

  if (!exists) {
    const count = state.gallery.readHistoryCount.reload() + 1;
    state.gallery.readHistoryCount.set(count);

    if (count > HISTORY_LIMIT) {
      pruneReadHistory();
    }
  }
}

function historyKey(galleryId: number, token: string): string {
  return `${HISTORY_KEY_PREFIX}${galleryId}:${token}`;
}

function pruneReadHistory(): void {
  const records = GM_listValues()
    .filter((key) => key.startsWith(HISTORY_KEY_PREFIX))
    .map((key) => ({ key, record: GM_getValue<ReadHistoryRecord | null>(key, null) }))
    .filter((entry): entry is { key: string; record: ReadHistoryRecord } => entry.record !== null)
    .sort((left, right) => left.record.updatedAt - right.record.updatedAt);

  for (const entry of records.slice(0, HISTORY_PRUNE_COUNT)) {
    GM_deleteValue(entry.key);
  }

  state.gallery.readHistoryCount.set(Math.max(0, records.length - HISTORY_PRUNE_COUNT));
}
