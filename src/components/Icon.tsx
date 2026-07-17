import { h } from "preact";

export type IconName =
  | "arrow-up"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "heart"
  | "home"
  | "menu"
  | "settings"
  | "star";

export function Icon(props: {
  className?: string;
  filled?: boolean;
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}) {
  const definition = ICON_DEFINITIONS[props.name];
  const filled = definition.solid || (definition.fillable && props.filled);
  const size = props.size ?? 24;

  return (
    <svg
      className={`ehpeek-icon block flex-none${props.className ? ` ${props.className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      stroke-width={props.strokeWidth ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
      data-icon-name={props.name}
      aria-hidden="true"
      focusable="false"
    >
      {definition.paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

type IconDefinition = {
  fillable?: boolean;
  paths: readonly string[];
  solid?: boolean;
};

const ICON_DEFINITIONS: Record<IconName, IconDefinition> = {
  "arrow-up": {
    paths: ["m5 12 7-7 7 7", "M12 5v14"],
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
  heart: {
    fillable: true,
    paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"],
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
