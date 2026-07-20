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
