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
      this.lastSaved = this.target?.history.save(this.pending) ?? null;
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
