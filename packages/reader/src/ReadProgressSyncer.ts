export type ReadProgressPublisher = {
  subscribe: (listener: (pageNum: number) => void) => () => void;
};
export type ReadProgressReceiver = {
  setProgress: (pageNum: number) => void;
};

export type ReadProgressPort = ReadProgressPublisher &
  ReadProgressReceiver & {
    current: () => number | null;
  };

/** Receiving progress is silent; only local navigation publishes changes. */
export class ReadProgressSyncer {
  private readonly disconnect: () => void;
  constructor(source: ReadProgressPublisher, target: ReadProgressReceiver) {
    this.disconnect = source.subscribe((pageNum) =>
      target.setProgress(pageNum),
    );
  }
  dispose(): void {
    this.disconnect();
  }
}

export function createReadProgressPublisher() {
  const listeners = new Set<(pageNum: number) => void>();
  return {
    subscribe(listener: (pageNum: number) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(pageNum: number) {
      for (const listener of listeners) listener(pageNum);
    },
  };
}
