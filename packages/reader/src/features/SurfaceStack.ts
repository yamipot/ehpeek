import type { ReadingSurface, SurfaceHistory } from "../kit/interfaces";

/** Optional browser history transport; surface ownership remains inside the reader. */
export class SurfaceStack {
  private readonly entries: ReadingSurface[] = [];
  private pending = false;
  private closing: Promise<void> = Promise.resolve();
  private afterClose: (() => void) | null = null;
  private readonly unsubscribe: () => void;
  constructor(
    private readonly close: (surface: ReadingSurface) => Promise<void> | void,
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
  requestClose(surface: ReadingSurface, afterClose?: () => void): boolean {
    if (this.pending || this.top !== surface) return false;
    this.pending = true;
    this.afterClose = afterClose ?? null;
    if (this.history) this.history.back(1);
    else void this.closeToDepth(this.depth - 1).catch(this.onError);
    return true;
  }
  requestCloseAll(): void {
    if (this.pending || this.depth === 0) return;
    this.pending = true;
    if (this.history) this.history.back(this.depth);
    else void this.closeToDepth(0).catch(this.onError);
  }
  closeToDepth(depth: number): Promise<void> {
    const closing = this.closing.then(() => this.reconcileDepth(depth));
    this.closing = closing.catch(() => {});
    return closing;
  }
  private async reconcileDepth(depth: number): Promise<void> {
    try {
      while (this.depth > Math.max(0, depth)) {
        const surface = this.entries.pop()!;
        await this.close(surface);
      }
      const afterClose = this.afterClose;
      this.afterClose = null;
      this.pending = false;
      afterClose?.();
    } finally {
      this.afterClose = null;
      this.pending = false;
    }
  }
  dispose(): void {
    this.unsubscribe();
    this.entries.length = 0;
    this.afterClose = null;
  }
}
