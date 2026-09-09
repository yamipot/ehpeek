type StateValue<T> = {
  defaultValue: T;
  value: T;
};

export type PersistedGMStoreValue<T> = StateValue<T> & {
  clear: () => Promise<void>;
  preload: () => PersistedGMStoreValue<T>;
  set: (value: T) => void;
  setAsync: (value: T) => Promise<void>;
  reload: () => Promise<T>;
};

type PersistedLocalStoreValue<T> = StateValue<T> & {
  clear: () => void;
  set: (value: T) => void;
  reload: () => T;
  stored: () => boolean;
};

export type StateCodec<T> = {
  parse: (value: unknown) => T | undefined;
};

export type LocalStateCodec<T> = StateCodec<T> & {
  serialize: (value: T) => string | null;
};

const persistedStateValues = new Set<{ reload: () => Promise<unknown> }>();

export async function loadPersistedState(): Promise<void> {
  await Promise.all(Array.from(persistedStateValues, (item) => item.reload()));
}

export function persisted<T>(
  key: string,
  defaultValue: T,
  codec: StateCodec<T> = { parse: (value) => value as T },
): PersistedGMStoreValue<T> {
  const item: PersistedGMStoreValue<T> = {
    defaultValue,
    value: defaultValue,
    async clear() {
      item.value = defaultValue;
      await GM.deleteValue(key);
    },
    preload() {
      persistedStateValues.add(item);
      return item;
    },
    set(value) {
      void item.setAsync(value).catch((error: unknown) => {
        console.error(`[ehpeek] Failed to persist ${key}`, error);
      });
    },
    async setAsync(value) {
      item.value = value;
      await GM.setValue(key, value);
    },
    async reload() {
      const stored = await GM.getValue<unknown>(key, defaultValue);
      const parsed = codec.parse(stored);
      item.value = parsed ?? defaultValue;
      if (parsed === undefined) {
        await GM.setValue(key, defaultValue);
      }
      return item.value;
    },
  };
  return item;
}

export function local<T>(
  key: string,
  defaultValue: T,
  codec: LocalStateCodec<T>,
): PersistedLocalStoreValue<T> {
  const read = () => {
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : codec.parse(stored) ?? defaultValue;
  };
  const item: PersistedLocalStoreValue<T> = {
    defaultValue,
    value: read(),
    set(value) {
      item.value = value;
      const stored = codec.serialize(value);
      if (stored === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, stored);
      }
    },
    reload() {
      item.value = read();
      return item.value;
    },
    clear() {
      item.value = defaultValue;
      window.localStorage.removeItem(key);
    },
    stored() {
      return window.localStorage.getItem(key) !== null;
    },
  };
  return item;
}

export function enumCodec<T extends string>(values: readonly T[]): LocalStateCodec<T> {
  return {
    parse: (value) => values.includes(value as T) ? value as T : undefined,
    serialize: (value) => value,
  };
}

export function numberRangeCodec(min: number, max: number): StateCodec<number> {
  return {
    parse: (value) =>
      typeof value === "number" &&
        Number.isFinite(value) &&
        value >= min &&
        value <= max
        ? value
        : undefined,
  };
}

export function nullableStateCodec<T>(codec: StateCodec<T>): StateCodec<T | null> {
  return {
    parse: (value) => value === null ? null : codec.parse(value),
  };
}

export function nullableCodec<T>(codec: LocalStateCodec<T>): LocalStateCodec<T | null> {
  return {
    parse: codec.parse,
    serialize: (value) => value === null ? null : codec.serialize(value),
  };
}

export function arrayCodec<T>(valid: (value: unknown) => value is T): StateCodec<T[]> {
  return {
    parse: (value) => Array.isArray(value) ? value.filter(valid) : undefined,
  };
}

export function jsonCodec<T>(codec: StateCodec<T>): LocalStateCodec<T> {
  return {
    parse(value) {
      if (typeof value !== "string") {
        return undefined;
      }
      try {
        return codec.parse(JSON.parse(value) as unknown);
      } catch {
        return undefined;
      }
    },
    serialize: (value) => JSON.stringify(value) ?? null,
  };
}
