const DEFAULT_CONCURRENT_LOADS = 6;

export type LoadQueueCallbacks<Target, Loaded> = {
  loadTarget: (target: Target) => Promise<Loaded>;
  markLoading: (target: Target) => number | null;
  onLoaded: (target: Target, loaded: Loaded, token: number) => void | Promise<void>;
  onError: (target: Target, error: unknown, token: number) => void;
};

export type PrioritizedLoadTarget<Target> = {
  key: string | number;
  priority: number;
  target: Target;
};

export class PriorityLoadQueue<Target, Loaded> {
  private pending = new Map<string | number, PrioritizedLoadTarget<Target>>();
  private active = new Set<string | number>();
  private timer: number | null = null;
  private disposed = false;
  private callbacks: Partial<LoadQueueCallbacks<Target, Loaded>> = {};

  constructor(
    private readonly concurrentLoads: number = DEFAULT_CONCURRENT_LOADS,
  ) { }

  updateCallbacks(callbacks: LoadQueueCallbacks<Target, Loaded>): void {
    this.callbacks = callbacks;
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.pending.clear();

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  sync(targets: PrioritizedLoadTarget<Target>[]): void {
    this.pending = new Map(targets
      .filter(({ key }) => !this.active.has(key))
      .map((target) => [target.key, target]));
    this.schedule();
  }

  private schedule(): void {
    if (this.timer !== null || this.disposed || !this.callbacks.loadTarget) {
      return;
    }

    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.process();
    }, 0);
  }

  private process(): void {
    if (this.disposed) {
      return;
    }

    while (this.active.size < this.concurrentLoads) {
      const next = Array.from(this.pending.values())
        .sort((left, right) => left.priority - right.priority)[0];
      if (!next) {
        return;
      }
      this.pending.delete(next.key);
      this.start(next);
    }
  }

  private start({ key, target }: PrioritizedLoadTarget<Target>): void {
    const { loadTarget, markLoading, onLoaded, onError } = this.callbacks;
    if (!loadTarget || !markLoading || !onLoaded || !onError) {
      return;
    }
    const token = markLoading(target);

    if (token === null) {
      return;
    }

    this.active.add(key);

    void loadTarget(target)
      .then(async (loaded) => {
        if (!this.disposed) {
          await onLoaded(target, loaded, token);
        }
      })
      .catch((error) => {
        if (!this.disposed) {
          onError(target, error, token);
        }
      })
      .finally(() => {
        this.active.delete(key);
        this.process();
      });
  }
}
