type DecodeStatus = "queued" | "loading" | "done";

type DecodeCacheEntry = {
  bytes: number;
  image: HTMLImageElement;
  pins: number;
  status: DecodeStatus;
};

/** Retains decoded thumbnails while visible tiles pin them. */
export class PreviewDecodeCache {
  private bytes = 0;
  private activeLoads = 0;
  private readonly pending: string[] = [];
  private readonly entries = new Map<string, DecodeCacheEntry>();

  constructor(
    private readonly byteLimit: number,
    private readonly itemLimit: number,
    // Bound how many thumbnails decode at once. A fast scroll would otherwise
    // fire a load+decode for every tile it flings past simultaneously, and the
    // memory spike crashes the iOS Safari web-content process.
    private readonly maxConcurrent: number = 3,
  ) {}

  retain(url: string): () => void {
    const entry = this.ensure(url);
    entry.pins += 1;
    this.touch(url, entry);
    this.prune();
    return () => {
      const current = this.entries.get(url);
      if (current !== entry) {
        return;
      }
      current.pins = Math.max(0, current.pins - 1);
      this.prune();
    };
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      entry.image.onload = null;
      entry.image.onerror = null;
      entry.image.removeAttribute("src");
    }
    this.entries.clear();
    this.pending.length = 0;
    this.bytes = 0;
    this.activeLoads = 0;
  }

  private ensure(url: string): DecodeCacheEntry {
    const cached = this.entries.get(url);
    if (cached) {
      return cached;
    }

    const image = new Image();
    image.decoding = "async";
    const entry: DecodeCacheEntry = { bytes: 0, image, pins: 0, status: "queued" };
    this.entries.set(url, entry);
    this.pending.push(url);
    this.pump();
    return entry;
  }

  /** Starts queued loads up to the concurrency limit, newest (last pinned) first. */
  private pump(): void {
    while (this.activeLoads < this.maxConcurrent && this.pending.length > 0) {
      const url = this.pending.pop()!;
      const entry = this.entries.get(url);
      if (!entry || entry.status !== "queued") {
        continue;
      }
      entry.status = "loading";
      this.activeLoads += 1;
      const { image } = entry;
      image.onload = () => {
        const bytes = Math.max(1, image.naturalWidth) * Math.max(1, image.naturalHeight) * 4;
        this.bytes += bytes - entry.bytes;
        entry.bytes = bytes;
        void image.decode().catch(() => undefined).finally(() => this.finishLoad(entry));
      };
      image.onerror = () => {
        this.finishLoad(entry);
        if (entry.pins === 0) {
          this.evict(url, entry);
        }
      };
      image.src = url;
    }
  }

  /** Frees the load slot exactly once, then lets pruning/pumping continue. */
  private finishLoad(entry: DecodeCacheEntry): void {
    if (entry.status !== "loading") {
      return;
    }
    entry.status = "done";
    this.activeLoads = Math.max(0, this.activeLoads - 1);
    this.prune();
    this.pump();
  }

  private touch(url: string, entry: DecodeCacheEntry): void {
    this.entries.delete(url);
    this.entries.set(url, entry);
  }

  private prune(): void {
    while (this.entries.size > this.itemLimit || this.bytes > this.byteLimit) {
      const removable = Array.from(this.entries).find(([, entry]) => entry.pins === 0);
      if (!removable) {
        break;
      }
      this.evict(removable[0], removable[1]);
    }
  }

  private evict(url: string, entry: DecodeCacheEntry): void {
    if (this.entries.get(url) !== entry) {
      return;
    }
    this.entries.delete(url);
    this.bytes = Math.max(0, this.bytes - entry.bytes);
    if (entry.status === "loading") {
      // Occupying a load slot; drop it before we abort the request below.
      this.activeLoads = Math.max(0, this.activeLoads - 1);
    } else if (entry.status === "queued") {
      const index = this.pending.lastIndexOf(url);
      if (index !== -1) {
        this.pending.splice(index, 1);
      }
    }
    entry.status = "done";
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.removeAttribute("src");
    this.pump();
  }
}
