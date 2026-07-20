export type PageType =
  | {
      type: "gallery";
      url: string;
      galleryId: number;
      token: string;
      previewIndex: number;
      peekPage: number | null;
    }
  | {
      type: "image";
      url: string;
      galleryId: number;
      pageNum: number;
    }
  | {
      type: "search";
      url: string;
    }
  | {
      type: "favorites";
      url: string;
    }
  | {
      type: "myTags";
      url: string;
    }
  | {
      type: "other";
      url: string;
    };

type EhSiteTheme = "e-hentai" | "exhentai";

const EXHENTAI_HOST = "exhentai.org";
const EXHENTAI_ONION_HOST = "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion";
const GALLERY_API_HOSTS = new Set(["api.e-hentai.org", "s.exhentai.org"]);

export function ehSiteTheme(url = window.location.href): EhSiteTheme {
  const hostname = new URL(url, window.location.href).hostname;
  return hostname === EXHENTAI_HOST ||
    hostname.endsWith(`.${EXHENTAI_HOST}`) ||
    hostname === EXHENTAI_ONION_HOST ||
    hostname.endsWith(`.${EXHENTAI_ONION_HOST}`)
    ? "exhentai"
    : "e-hentai";
}

export function isSameOriginUrl(url: string, baseUrl = window.location.href): boolean {
  try {
    return new URL(url, baseUrl).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

export function galleryIdentityFromUrl(url = window.location.href): { galleryId: number; token: string } | null {
  try {
    const match = new URL(url, window.location.href).pathname.match(/^\/g\/(\d+)\/([^/]+)/i);
    const galleryId = Number(match?.[1]);
    const token = match?.[2];
    return token && Number.isSafeInteger(galleryId) && galleryId > 0
      ? { galleryId, token }
      : null;
  } catch {
    return null;
  }
}

export function isAllowedGalleryApiUrl(apiUrl: URL, pageUrl: URL): boolean {
  const allowedHost = apiUrl.origin === pageUrl.origin ||
    (apiUrl.protocol === "https:" && GALLERY_API_HOSTS.has(apiUrl.hostname));
  return allowedHost &&
    /^\/api\.php$/i.test(apiUrl.pathname) &&
    !apiUrl.username &&
    !apiUrl.password &&
    !apiUrl.search &&
    !apiUrl.hash;
}

export function singlePageRoute(url: string): PageType | null {
  const page = extractPageType(url);

  if (page.type === "search" || page.type === "favorites") {
    return page;
  }

  if (page.type !== "gallery") {
    return null;
  }

  const parsed = new URL(url, window.location.href);
  let supportedSearch = true;
  parsed.searchParams.forEach((_value, key) => {
    supportedSearch &&= key === "p";
  });
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  let supportedHash = true;
  hash.forEach((_value, key) => {
    supportedHash &&= key === "peek_page";
  });
  return supportedSearch && supportedHash ? page : null;
}

function urlPath(url: string): string {
  try {
    return new URL(url, window.location.href).pathname.toLowerCase();
  } catch {
    return "";
  }
}

export function galleryTagNameFromUrl(url: string): string | null {
  const encodedName = urlPath(url).match(/^\/tag\/(.+?)\/?$/i)?.[1];

  try {
    return encodedName ? decodeURIComponent(encodedName.replace(/\+/g, " ")) : null;
  } catch {
    return null;
  }
}

export function isFullImageUrl(url: string): boolean {
  return urlPath(url).includes("/fullimg");
}

export function extractPageType(url = window.location.href): PageType {
  try {
    const parsed = new URL(url, window.location.href);
    const galleryMatch = parsed.pathname.match(/^\/g\/(\d+)\/([^/]+)\/?$/i);

    if (galleryMatch) {
      const galleryId = Number(galleryMatch[1]);
      const token = galleryMatch[2];

      if (token && Number.isFinite(galleryId) && galleryId > 0) {
        return {
          type: "gallery",
          url: parsed.href,
          galleryId,
          token,
          previewIndex: previewPageIndex(parsed.href),
          peekPage: peekPageFromHash(parsed.hash),
        };
      }
    }

    const imageMatch = parsed.pathname.match(/^\/s\/[^/]+\/(\d+)-(\d+)\/?$/i);

    if (imageMatch) {
      const galleryId = Number(imageMatch[1]);
      const pageNum = Number(imageMatch[2]);

      if (Number.isFinite(galleryId) && galleryId > 0 && Number.isFinite(pageNum) && pageNum > 0) {
        return {
          type: "image",
          url: parsed.href,
          galleryId,
          pageNum,
        };
      }
    }

    if (parsed.pathname === "/favorites.php") {
      return {
        type: "favorites",
        url: parsed.href,
      };
    }

    if (/^\/mytags\/?$/.test(parsed.pathname)) {
      return {
        type: "myTags",
        url: parsed.href,
      };
    }

    if (
      parsed.pathname === "/" ||
      parsed.pathname.startsWith("/tag/") ||
      parsed.pathname.startsWith("/uploader/") ||
      /^\/(?:popular|watched)\/?$/.test(parsed.pathname)
    ) {
      return {
        type: "search",
        url: parsed.href,
      };
    }

    return {
      type: "other",
      url: parsed.href,
    };
  } catch {
    return {
      type: "other",
      url,
    };
  }
}

export function galleryPageNumber(url: string): number | undefined {
  const page = extractPageType(url);
  return page.type === "image" ? page.pageNum : undefined;
}

export function previewPageIndex(url = window.location.href): number {
  try {
    const value = Number(new URL(url).searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function previewUrlForIndex(previewIndex: number, pageUrl = window.location.href): string {
  const url = new URL(pageUrl);

  if (previewIndex <= 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", String(previewIndex));
  }

  url.hash = "";
  return url.href;
}

export function previewPageIndexForGalleryPage(galleryPage: number, pageSize: number, maxPreviewIndex: number): number {
  const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
  return Math.min(previewIndex, maxPreviewIndex);
}

export function peekPageFromHash(hash = window.location.hash): number | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const page = Number(params.get("peek_page") || "");

  return Number.isFinite(page) && page > 0 ? page : null;
}

export function updatePeekLocation(pageNumber: number | undefined, pageSize: number, maxPreviewIndex: number): void {
  if (!pageNumber || pageNumber <= 0) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextValue = String(pageNumber);
  const nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex);
  let changed = false;

  if (nextPreviewIndex === 0) {
    if (url.searchParams.has("p")) {
      url.searchParams.delete("p");
      changed = true;
    }
  } else if (url.searchParams.get("p") !== String(nextPreviewIndex)) {
    url.searchParams.set("p", String(nextPreviewIndex));
    changed = true;
  }

  if (params.get("peek_page") !== nextValue) {
    params.set("peek_page", nextValue);
    changed = true;
  }

  if (!changed) {
    return;
  }

  url.hash = params.toString();
  window.history.replaceState(window.history.state, "", url.href);
}
