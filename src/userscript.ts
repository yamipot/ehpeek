export type UserscriptDownloadDetails = {
  name?: string;
  onerror?: (error: unknown) => void;
  url: string;
};

export function startUserscriptDownload(details: UserscriptDownloadDetails): boolean {
  let failureReported = false;
  const reportFailure = (error: unknown) => {
    if (failureReported) {
      return;
    }
    failureReported = true;
    details.onerror?.(error);
  };
  const apiDetails: GmDownloadDetails = {
    url: details.url,
    ...(details.name ? { name: details.name } : {}),
    onerror: reportFailure,
  };

  try {
    if (GM.download) {
      void Promise.resolve(GM.download(apiDetails)).catch(reportFailure);
      return true;
    }
    if (typeof GM_download === "function") {
      GM_download(apiDetails);
      return true;
    }
  } catch (error) {
    reportFailure(error);
    return false;
  }

  reportFailure(new Error("Userscript download API is unavailable."));
  return false;
}
