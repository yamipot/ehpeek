import type { ReadingSurface, SurfaceHistory } from "../kit/interfaces";

export type SurfaceCloseReason = "return" | "switch" | "dismiss";

/** Optional browser history transport; surface ownership remains inside the reader. */
export class SurfaceStack {
  private readonly entries: ReadingSurface[] = [];
  private pending = false;
  private closing: Promise<void> = Promise.resolve();
  private closeReason: SurfaceCloseReason = "return";
  private readonly settled = new Set<() => void>();
  private readonly unsubscribe: () => void;
  constructor(
    private readonly close: (surface: ReadingSurface, reason: SurfaceCloseReason) => Promise<void> | void,
    private readonly onError: (error: unknown) => void,
    private readonly history?: SurfaceHistory,
  ) {
    this.unsubscribe =
      history?.subscribe((depth) => {
        void this.closeToDepth(depth).catch(onError);
      }) ?? (() => {});
  }
  get depth(): number {
    return this.entries.length;
  }
  get top(): ReadingSurface | undefined {
    return this.entries[this.entries.length - 1];
  }
  push(surface: ReadingSurface): void {
    this.entries.push(surface);
    this.history?.push(this.depth, surface);
  }
  rollbackPush(surface: ReadingSurface): void {
    if (this.top !== surface) return;
    this.entries.pop();
    this.history?.back(1);
  }
  requestClose(surface: ReadingSurface, reason: SurfaceCloseReason = "return"): boolean {
    if (this.pending || this.top !== surface) return false;
    this.pending = true;
    this.closeReason = reason;
    if (this.history) this.history.back(1);
    else void this.closeToDepth(this.depth - 1).catch(this.onError);
    return true;
  }
  requestCloseAll(): void {
    if (this.pending || this.depth === 0) return;
    this.pending = true;
    this.closeReason = "dismiss";
    if (this.history) this.history.back(this.depth);
    else void this.closeToDepth(0).catch(this.onError);
  }
  closeToDepth(depth: number): Promise<void> {
    const closing = this.closing.then(() => this.reconcileDepth(depth));
    this.closing = closing.catch(() => {});
    return closing;
  }
  whenSettled(): Promise<void> {
    return this.pending
      ? new Promise(resolve => this.settled.add(resolve))
      : this.closing;
  }
  private async reconcileDepth(depth: number): Promise<void> {
    try {
      while (this.depth > Math.max(0, depth)) {
        const surface = this.entries.pop()!;
        await this.close(surface, this.depth > Math.max(0, depth) ? "dismiss" : this.closeReason);
      }
    } finally {
      this.pending = false;
      this.closeReason = "return";
      for (const resolve of this.settled) resolve();
      this.settled.clear();
    }
  }
  dispose(): void {
    this.unsubscribe();
    this.entries.length = 0;
    this.pending = false;
    this.closeReason = "return";
    for (const resolve of this.settled) resolve();
    this.settled.clear();
  }
}
