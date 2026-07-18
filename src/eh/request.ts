const REQUEST_TIMEOUT_MS = 30_000;

export type PageRequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: "GET" | "POST";
  signal?: AbortSignal;
  timeoutMs?: number | null;
};

export type PageResponse = {
  document: Document;
  url: string;
};

export type GalleryTagApiInfo = {
  apiKey: string;
  apiUid: number;
  apiUrl: string;
  galleryId: number;
  token: string;
};

export type GalleryRatingResult = {
  average: number;
  count: number;
  value: number;
};

export async function requestPage(url: string, options: PageRequestOptions = {}): Promise<PageResponse> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeoutMs = options.timeoutMs === undefined ? REQUEST_TIMEOUT_MS : options.timeoutMs;
  const timeout = timeoutMs === null ? null : window.setTimeout(abort, timeoutMs);

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", abort, { once: true });
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      body: options.body,
      credentials: "include",
      headers: options.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return {
      document: new DOMParser().parseFromString(html, "text/html"),
      url: response.url || url,
    };
  } finally {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function updateGalleryFavorite(actionUrl: string, value: string): Promise<void> {
  const body = new URLSearchParams();
  body.set("favcat", value);
  body.set("favnote", "");
  body.set("apply", "Apply Changes");
  body.set("update", "1");

  await requestPage(actionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function updateGalleryRating(
  info: GalleryTagApiInfo,
  value: number,
): Promise<GalleryRatingResult> {
  const result = await requestGalleryApi(info, {
    method: "rategallery",
    rating: Math.round(value * 2),
  });
  const average = Number(result.rating_avg);
  const count = Number(result.rating_cnt);
  const rating = Number(result.rating_usr);

  if (!Number.isFinite(average) || !Number.isFinite(count) || !Number.isFinite(rating)) {
    throw new Error("Gallery rating response is invalid.");
  }

  return { average, count, value: rating };
}

export async function updateGalleryTagVote(
  info: GalleryTagApiInfo,
  tag: string,
  vote: number,
): Promise<string> {
  const result = await requestGalleryApi(info, {
    method: "taggallery",
    tags: tag,
    vote,
  });

  if (typeof result.tagpane !== "string") {
    throw new Error("Gallery tag response is invalid.");
  }

  return result.tagpane;
}

async function requestGalleryApi(
  info: GalleryTagApiInfo,
  payload: Record<string, string | number>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(info.apiUrl, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        apiuid: info.apiUid,
        apikey: info.apiKey,
        gid: info.galleryId,
        token: info.token,
      }),
      credentials: "include",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result: unknown = await response.json();

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("Gallery API response is invalid.");
    }

    const record = result as Record<string, unknown>;

    if (typeof record.error === "string" && record.error) {
      throw new Error(record.error);
    }

    return record;
  } finally {
    window.clearTimeout(timeout);
  }
}
