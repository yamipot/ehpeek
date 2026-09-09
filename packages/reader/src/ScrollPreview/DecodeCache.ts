type DecodeCacheEntry = {
  bytes: number;
  image: HTMLImageElement;
  pins: number;
};

export class PreviewDecodeCache {
  private bytes = 0;
  private readonly entries = new Map<string, DecodeCacheEntry>();

  constructor(
    private readonly byteLimit: number,
    private readonly itemLimit: number,
  ) {}

  retain(url: string): () => void {
    const entry = this.ensure(url);
    entry.pins += 1;
    this.touch(url, entry);
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
      entry.image.removeAttribute("src");
    }
    this.entries.clear();
    this.bytes = 0;
  }

  private ensure(url: string): DecodeCacheEntry {
    const cached = this.entries.get(url);
    if (cached) {
      return cached;
    }

    const image = new Image();
    const entry: DecodeCacheEntry = { bytes: 0, image, pins: 0 };
    image.decoding = "async";
    image.onload = () => {
      const bytes = Math.max(1, image.naturalWidth) * Math.max(1, image.naturalHeight) * 4;
      this.bytes += bytes - entry.bytes;
      entry.bytes = bytes;
      void image.decode().catch(() => undefined).finally(() => this.prune());
    };
    image.onerror = () => {
      if (entry.pins === 0) {
        this.evict(url, entry);
      }
    };
    image.src = url;
    this.entries.set(url, entry);
    this.prune();
    return entry;
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
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.removeAttribute("src");
  }
}
