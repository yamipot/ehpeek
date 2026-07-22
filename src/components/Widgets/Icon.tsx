import { createMemo, For } from "solid-js";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "arrows-horizontal"
  | "arrows-vertical"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "download"
  | "external-link"
  | "fullscreen"
  | "fullscreen-exit"
  | "heart"
  | "history"
  | "home"
  | "menu"
  | "panda-peek"
  | "pages"
  | "refresh"
  | "search"
  | "settings"
  | "star";

export function Icon(props: {
  filled?: boolean;
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}) {
  const definition = createMemo(() => ICON_DEFINITIONS[props.name]);
  const filled = createMemo(() => definition().solid || (definition().fillable && props.filled));

  return (
    <svg
      class="ehpeek-icon block flex-none"
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      fill={filled() ? "currentColor" : "none"}
      stroke={filled() ? "none" : "currentColor"}
      stroke-width={props.strokeWidth ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
      data-icon-name={props.name}
      aria-hidden="true"
    >
      <For each={definition().filledPaths}>{(path) => <path d={path} fill="currentColor" stroke="none" />}</For>
      <For each={definition().paths}>{(path) => <path d={path} />}</For>
    </svg>
  );
}

type IconDefinition = {
  fillable?: boolean;
  filledPaths?: readonly string[];
  paths: readonly string[];
  solid?: boolean;
};

const ICON_DEFINITIONS: Record<IconName, IconDefinition> = {
  "arrow-left": {
    paths: ["M19 12H5", "m12 19-7-7 7-7"],
  },
  "arrow-right": {
    paths: ["M5 12h14", "m12 5 7 7-7 7"],
  },
  "arrow-up": {
    paths: ["m5 12 7-7 7 7", "M12 5v14"],
  },
  "arrows-horizontal": {
    paths: ["M3 12h18", "m7 8-4 4 4 4", "m17 8 4 4-4 4"],
  },
  "arrows-vertical": {
    paths: ["M12 3v18", "m8 7 4-4 4 4", "m8 17 4 4 4-4"],
  },
  check: {
    paths: ["m5 12.5 4.25 4.25L19.5 6.5"],
  },
  "chevron-left": {
    paths: ["m15 18-6-6 6-6"],
  },
  "chevron-right": {
    paths: ["m9 18 6-6-6-6"],
  },
  close: {
    paths: ["M6 6l12 12", "M18 6 6 18"],
  },
  download: {
    paths: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  },
  "external-link": {
    paths: ["M14 4h6v6", "m20 4-9 9", "M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"],
  },
  fullscreen: {
    paths: ["M8 3H3v5", "M16 3h5v5", "M3 16v5h5", "M21 16v5h-5"],
  },
  "fullscreen-exit": {
    paths: ["M8 3v5H3", "M16 3v5h5", "M3 16h5v5", "M21 16h-5v5"],
  },
  heart: {
    fillable: true,
    paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"],
  },
  history: {
    paths: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 7v5l3 2"],
  },
  home: {
    paths: ["m3 10.5 9-7.5 9 7.5", "M5.5 9v11h13V9", "M9.5 20v-6h5v6"],
  },
  menu: {
    paths: [
      "M12 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
    ],
    solid: true,
  },
  "panda-peek": {
    filledPaths: [
      "M7.2 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
      "M16.8 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
      "M7.6 9.8c.5-1.2 1.6-1.8 2.6-1.3s1.3 1.8.8 3-1.6 1.8-2.6 1.3-1.3-1.8-.8-3Z",
      "M13.8 8.5c1-.5 2.1.1 2.6 1.3s.2 2.5-.8 3-2.1-.1-2.6-1.3-.2-2.5.8-3Z",
      "M10.9 13.6c0-.6.5-.9 1.1-.9s1.1.3 1.1.9-.5 1-1.1 1-1.1-.4-1.1-1Z",
      "M5.2 13.7a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z",
      "M18.8 14.1a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z",
    ],
    paths: [
      "M5 17c-.8-6.4 2.1-10.8 7-10.8s7.8 4.4 7 10.8",
      "M12 14.6v.7c0 .7-.6 1.2-1.3 1.2m1.3-1.2c0 .7.6 1.2 1.3 1.2",
      "M2 17h20",
    ],
  },
  pages: {
    paths: ["M3 5h8v14H3z", "M13 5h8v14h-8z"],
  },
  refresh: {
    paths: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  },
  search: {
    paths: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16.2 16.2 4.3 4.3"],
  },
  settings: {
    paths: [
      "M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4A2 2 0 0 0 4 9.9l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z",
      "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    ],
  },
  star: {
    fillable: true,
    paths: ["m12 2.75 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.24 6.3 20.23l1.09-6.34-4.61-4.49 6.37-.93Z"],
  },
};
