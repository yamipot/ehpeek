import {
  createReader,
  type ContentSource,
  type ReaderInstance,
  type ReaderSettings,
} from "@ehpeek/reader";

export function createClientReader(source: ContentSource): ReaderInstance {
  const settings: Partial<ReaderSettings> = { previewDirection: "ttb" };
  return createReader({
    source,
    settings,
    onSettingChange: {
      previewDirection: (direction) => {
        const value: "ltr" | "rtl" | "ttb" = direction;
        console.log(value);
      },
    },
    onProgress: (page) => console.log(page.pageNum),
  });
}
