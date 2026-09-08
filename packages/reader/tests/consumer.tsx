import { ReadingView } from "@ehpeek/reader";
import type {
  ReaderInstance,
  ReadingViewOptions,
  ReaderSettings,
  ContentSource,
  ReaderContainer,
  ReaderCustomization,
  ReaderPlacement,
  SurfaceHistory,
} from "@ehpeek/reader/interfaces";
import type {
  ButtonProps,
  IconButtonProps,
  IconLinkProps,
  PopoverProps,
} from "@ehpeek/reader/kit/Widgets";

export { createPointerGestureElement } from "@ehpeek/reader/kit/PointerGesture";
export { applyUiScale } from "@ehpeek/reader/kit/ui";
export { clamp } from "@ehpeek/reader/kit/helpers";
export { readerLocales } from "@ehpeek/reader/kit/i18n";

export type ClientInterfaces = [ReaderContainer, ReaderCustomization, ReaderPlacement, SurfaceHistory];

export function currentView(instance: ReaderInstance): "reader" | "preview" | null {
  return instance.activeView;
}

export function updateClientSettings(instance: ReaderInstance) {
  instance.settings.set("previewDirection", "ttb");
}

export function ClientReader(props: { source: ContentSource }) {
  const settings: Partial<ReaderSettings> = { previewDirection: "ttb" };
  const options: ReadingViewOptions = {
    get source() { return props.source; },
    settings,
    onSettingChange: {
      previewDirection: (direction) => {
        const value: "ltr" | "rtl" | "ttb" = direction;
        console.log(value);
      },
    },
    onProgress: (page) => console.log(page.pageNum),
  };
  return <ReadingView options={options} />;
}


export const buttonProps: ButtonProps = {
  variant: "control",
  disabled: true,
  type: "button",
};
export const iconProps: IconButtonProps = {
  variant: "surface",
  size: "sm",
  "aria-label": "Zoom",
};
export const linkProps: IconLinkProps = {
  variant: "ghost",
  size: "xl",
  href: "/settings",
};
export const popoverProps: PopoverProps = {
  outsideEvent: "pointerdown",
  contains: (target) => target.nodeType === 1,
  onOutsidePress: (event) => event.preventDefault(),
};
