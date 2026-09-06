import { createSignal, type Accessor, type Setter } from "solid-js";
import type {
  GalleryReadHistory,
  ReadHistoryRecord,
} from "../state/readHistory";

const SAVE_DELAY_MS = 10_000;

export type ReadingProgress = {
  currentPage: number;
  hasHistory: boolean;
  totalPages: number | null;
};

export class ReadingProgressSession {
  readonly progress: Accessor<ReadingProgress>;
  private readonly setProgress: Setter<ReadingProgress>;
  private pending: ReadHistoryRecord | null = null;
  private lastSaved: ReadHistoryRecord | null = null;
  private saving: Promise<void> | null = null;
  private timer: number | null = null;

  constructor(
    private readonly target: {
      history: GalleryReadHistory;
      record: Omit<ReadHistoryRecord, "pageNum" | "updatedAt">;
    } | null,
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
      hasHistory: this.target !== null,
      totalPages: totalPages ?? this.progress().totalPages,
    });
    if (!this.target) {
      return;
    }

    const nextRecord = {
      ...this.target.record,
      pageNum,
      totalPages,
      updatedAt: Date.now(),
    };

    if (!this.saving && this.sameProgress(nextRecord, this.lastSaved)) {
      this.pending = null;
      return;
    }

    this.pending = nextRecord;
    this.schedule();
  }

  flush = (): Promise<void> => {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.saving) {
      return this.saving.then(() => this.flush());
    }
    if (!this.pending) {
      return Promise.resolve();
    }
    this.saving = this.savePending(this.pending).finally(() => {
      this.saving = null;
    });
    return this.saving;
  };

  dispose(): void {
    void this.flush();
    window.removeEventListener("pagehide", this.flush);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private async savePending(record: ReadHistoryRecord): Promise<void> {
    try {
      if (!this.sameProgress(record, this.lastSaved)) {
        this.lastSaved = await this.target?.history.save(record) ?? null;
      }
      // New progress may arrive while GM storage is still writing this record.
      if (this.pending === record) {
        this.pending = null;
      }
    } catch (error) {
      console.error("[ehpeek] Failed to save reading progress", error);
    }
  }

  private schedule(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = window.setTimeout(this.flush, SAVE_DELAY_MS);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      void this.flush();
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
