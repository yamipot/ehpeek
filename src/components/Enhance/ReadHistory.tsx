export type ReadButtonInfo = {
  label: string;
  detail: string;
};

export function ReadButton(props: {
  info: ReadButtonInfo;
  onClick: () => void;
  variant: "gallery" | "touchGallery";
}) {
  const buttonClassName =
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700"
      : "ehpeek-continue-reading block box-border w-full max-w-full mt-xs min-h-sm py-xs px-sm rounded-sm border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-center font-sans textsize-md font-700 leading-[1.15]";
  const detailClassName =
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case"
      : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-sm font-600";

  return (
    <button
      type="button"
      class={buttonClassName}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.info.label}
      <span class={detailClassName}>{props.info.detail}</span>
    </button>
  );
}

const HISTORY_KEY_PREFIX = "ehpeek:history:";
const HISTORY_COUNT_KEY = "ehpeek:history-count";
const HISTORY_LIMIT = 2_000;
const HISTORY_PRUNE_COUNT = 1_000;
const SAVE_DELAY_MS = 10_000;

export type ReadHistoryRecord = {
  galleryId: number;
  token: string;
  galleryUrl: string;
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
    const count = GM_getValue(HISTORY_COUNT_KEY, 0) + 1;
    GM_setValue(HISTORY_COUNT_KEY, count);

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

  GM_setValue(HISTORY_COUNT_KEY, Math.max(0, records.length - HISTORY_PRUNE_COUNT));
}
