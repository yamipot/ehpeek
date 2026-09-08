import {
  createReader,
  type ContentSource,
  type ReaderInstance,
  type ReaderSettings,
} from "@ehpeek/reader";

import {
  type ButtonProps,
  type IconButtonProps,
  type IconLinkProps,
} from "@ehpeek/reader/components/Widgets/Button";
import { type PopoverProps } from "@ehpeek/reader/components/Widgets/Popover";

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
