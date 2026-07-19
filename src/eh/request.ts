const REQUEST_TIMEOUT_MS = 30_000;

type PageRequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: "GET" | "POST";
  signal?: AbortSignal;
  timeoutMs?: number | null;
};

type PageResponse = {
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

type GalleryRatingResult = {
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

export type MyTagMode = "hidden" | "marked" | "watched";

export async function addMyTag(tagName: string, tagSet: string, mode: MyTagMode): Promise<PageResponse> {
  const body = new URLSearchParams();
  body.set("usertag_action", "add");
  body.set("tagname_new", tagName);
  body.set("tagcolor_new", "");
  body.set("tagweight_new", "10");
  if (mode === "watched") {
    body.set("tagwatch_new", "on");
  } else if (mode === "hidden") {
    body.set("taghide_new", "on");
  }

  const url = new URL("/mytags", window.location.origin);
  url.searchParams.set("tagset", tagSet);

  return requestPage(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function deleteMyTag(tagId: string, tagSet: string): Promise<PageResponse> {
  const body = new URLSearchParams();
  body.set("usertag_action", "mass");
  body.set("usertag_target", "0");
  body.append("modify_usertags[]", tagId);
  const url = new URL("/mytags", window.location.origin);
  url.searchParams.set("tagset", tagSet);

  return requestPage(url.href, {
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
  const requestLog = {
    action: typeof payload.method === "string" ? payload.method : "unknown",
    apiOrigin: new URL(info.apiUrl).origin,
    galleryId: info.galleryId,
  };

  console.info("[ehpeek] Gallery API request started", requestLog);

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
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      signal: controller.signal,
    });

    console.info("[ehpeek] Gallery API response received", {
      ...requestLog,
      status: response.status,
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
  } catch (error) {
    console.error("[ehpeek] Gallery API request failed", requestLog, error);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
