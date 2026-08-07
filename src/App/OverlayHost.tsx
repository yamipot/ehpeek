import {
  createContext,
  createSignal,
  type Accessor,
  type JSX,
  untrack,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { applyUiScale, type UiScale } from "../uiScale";
import {
  createFullscreenController,
  type FullscreenController,
} from "./viewport";

export type OverlayHost = {
  element: HTMLDivElement;
  fullscreen: FullscreenController;
  fullscreenPixelScale: Accessor<number>;
  setUiScale: (scale: UiScale) => void;
};

export function createOverlayHost(
  parent: HTMLElement,
  initialUiScale: UiScale,
): OverlayHost {
  const element = document.createElement("div");
  element.dataset.ehpeekOverlayHost = "true";
  element.dataset.ehpeekUiRoot = "true";
  parent.append(element);

  let uiScale = initialUiScale;
  let fullscreenScale = 1;
  const [fullscreenPixelScale, setFullscreenPixelScale] = createSignal(1);
  const applyScale = () => applyUiScale(uiScale, element, fullscreenScale);
  const fullscreen = createFullscreenController(element, (factor) => {
    fullscreenScale = factor;
    setFullscreenPixelScale(factor);
    applyScale();
  });
  applyScale();

  return {
    element,
    fullscreen,
    fullscreenPixelScale,
    setUiScale: (scale) => {
      uiScale = scale;
      applyScale();
    },
  };
}

const OverlayHostContext = createContext<OverlayHost>();

export function OverlayHostProvider(props: {
  children: JSX.Element;
  host: OverlayHost;
}) {
  const host = untrack(() => props.host);
  return (
    <OverlayHostContext.Provider value={host}>
      {props.children}
    </OverlayHostContext.Provider>
  );
}

export function OverlayPortal(props: { children: JSX.Element }) {
  const host = useOverlayHost();
  return <Portal mount={host.element}>{props.children}</Portal>;
}

export function useOverlayHost(): OverlayHost {
  const host = useContext(OverlayHostContext);
  if (!host) {
    throw new Error("OverlayHostProvider is required for overlay content.");
  }
  return host;
}
