import type { LucideIcon } from "lucide-solid";
import ArrowDown from "lucide-solid/icons/arrow-down";
import ArrowLeft from "lucide-solid/icons/arrow-left";
import ArrowRight from "lucide-solid/icons/arrow-right";
import ArrowUp from "lucide-solid/icons/arrow-up";
import BookOpen from "lucide-solid/icons/book-open";
import Check from "lucide-solid/icons/check";
import ChevronLeft from "lucide-solid/icons/chevron-left";
import ChevronRight from "lucide-solid/icons/chevron-right";
import Columns2 from "lucide-solid/icons/columns-2";
import Download from "lucide-solid/icons/download";
import EllipsisVertical from "lucide-solid/icons/ellipsis-vertical";
import ExternalLink from "lucide-solid/icons/external-link";
import File from "lucide-solid/icons/file";
import Grid2X2 from "lucide-solid/icons/grid-2x2";
import Heart from "lucide-solid/icons/heart";
import History from "lucide-solid/icons/history";
import House from "lucide-solid/icons/house";
import Hand from "lucide-solid/icons/hand";
import Info from "lucide-solid/icons/info";
import LocateFixed from "lucide-solid/icons/locate-fixed";
import Maximize from "lucide-solid/icons/maximize";
import Minimize from "lucide-solid/icons/minimize";
import MoveHorizontal from "lucide-solid/icons/move-horizontal";
import MoveVertical from "lucide-solid/icons/move-vertical";
import Palette from "lucide-solid/icons/palette";
import Pencil from "lucide-solid/icons/pencil";
import Play from "lucide-solid/icons/play";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import Rows3 from "lucide-solid/icons/rows-3";
import ScanLine from "lucide-solid/icons/scan-line";
import Search from "lucide-solid/icons/search";
import Settings from "lucide-solid/icons/settings";
import Sparkles from "lucide-solid/icons/sparkles";
import Star from "lucide-solid/icons/star";
import X from "lucide-solid/icons/x";
import ZoomIn from "lucide-solid/icons/zoom-in";
import ZoomOut from "lucide-solid/icons/zoom-out";
import { createMemo, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-down"
  | "arrow-up"
  | "arrows-horizontal"
  | "arrows-vertical"
  | "book-open"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "download"
  | "edit"
  | "external-link"
  | "fullscreen"
  | "fullscreen-exit"
  | "grid"
  | "hand"
  | "heart"
  | "history"
  | "home"
  | "info"
  | "locate"
  | "menu"
  | "page"
  | "palette"
  | "panda-peek"
  | "pages"
  | "play"
  | "refresh"
  | "search"
  | "settings"
  | "sparkles"
  | "scroll-continuous"
  | "star"
  | "viewport"
  | "zoom-in"
  | "zoom-out";

export function Icon(props: {
  filled?: boolean;
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}) {
  const component = createMemo(() =>
    props.name === "panda-peek" ? undefined : LUCIDE_ICONS[props.name],
  );
  const filled = createMemo(() => props.filled && FILLABLE_ICONS.has(props.name));
  const size = createMemo(() =>
    typeof props.size === "number"
      ? `${props.size}px`
      : props.size ?? "var(--ui-icon-size-md)",
  );

  return (
    <>
      <Dynamic
        component={component()}
        class="ehpeek-icon block flex-none"
        size={size()}
        style={{ width: size(), height: size() }}
        color="currentColor"
        fill={filled() ? "currentColor" : "none"}
        stroke={filled() ? "none" : "currentColor"}
        strokeWidth={props.strokeWidth ?? 2}
        data-icon-name={props.name}
      />
      <Show when={props.name === "panda-peek"}>
        <PandaPeekIcon size={size()} strokeWidth={props.strokeWidth ?? 2} />
      </Show>
    </>
  );
}

type LucideIconName = Exclude<IconName, "panda-peek">;

const LUCIDE_ICONS: Record<LucideIconName, LucideIcon> = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-down": ArrowDown,
  "arrow-up": ArrowUp,
  "arrows-horizontal": MoveHorizontal,
  "arrows-vertical": MoveVertical,
  "book-open": BookOpen,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  close: X,
  download: Download,
  edit: Pencil,
  "external-link": ExternalLink,
  fullscreen: Maximize,
  "fullscreen-exit": Minimize,
  grid: Grid2X2,
  hand: Hand,
  heart: Heart,
  history: History,
  home: House,
  info: Info,
  locate: LocateFixed,
  menu: EllipsisVertical,
  page: File,
  palette: Palette,
  pages: Columns2,
  play: Play,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  sparkles: Sparkles,
  "scroll-continuous": Rows3,
  star: Star,
  viewport: ScanLine,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
};

const FILLABLE_ICONS = new Set<IconName>(["heart", "star"]);

const PANDA_FILLED_PATHS = [
  "M7.2 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
  "M16.8 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
  "M7.6 9.8c.5-1.2 1.6-1.8 2.6-1.3s1.3 1.8.8 3-1.6 1.8-2.6 1.3-1.3-1.8-.8-3Z",
  "M13.8 8.5c1-.5 2.1.1 2.6 1.3s.2 2.5-.8 3-2.1-.1-2.6-1.3-.2-2.5.8-3Z",
  "M10.9 13.6c0-.6.5-.9 1.1-.9s1.1.3 1.1.9-.5 1-1.1 1-1.1-.4-1.1-1Z",
  "M5.2 13.7a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z",
  "M18.8 14.1a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z",
] as const;

const PANDA_PATHS = [
  "M5 17c-.8-6.4 2.1-10.8 7-10.8s7.8 4.4 7 10.8",
  "M12 14.6v.7c0 .7-.6 1.2-1.3 1.2m1.3-1.2c0 .7.6 1.2 1.3 1.2",
  "M2 17h20",
] as const;

function PandaPeekIcon(props: { size: string; strokeWidth: number }) {
  return (
    <svg
      class="ehpeek-icon block flex-none"
      style={{ width: props.size, height: props.size }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={props.strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      data-icon-name="panda-peek"
      aria-hidden="true"
    >
      <For each={PANDA_FILLED_PATHS}>
        {(path) => <path d={path} fill="currentColor" stroke="none" />}
      </For>
      <For each={PANDA_PATHS}>{(path) => <path d={path} />}</For>
    </svg>
  );
}
