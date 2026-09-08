import {
  createContext,
  createSignal,
  type Accessor,
  type JSX,
  untrack,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { applyUiScale, markUiRoot, type UiScale } from "../ui";
import { ReaderTextsProvider, readerLocales, type ReaderTexts } from "../i18n";
import "../../styles";
import {
  createFullscreenController,
  type FullscreenController,
} from "../../features/Viewport";

export type OverlayHost = {
  element: HTMLDivElement;
  fullscreen: FullscreenController;
  fullscreenPixelScale: Accessor<number>;
  uiScale: Accessor<UiScale>;
  setUiScale: (scale: UiScale) => void;
  texts: ReaderTexts;
};

export function createOverlayHost(
  parent: HTMLElement,
  initialUiScale: UiScale = "small",
  texts: ReaderTexts = readerLocales.en,
): OverlayHost {
  const element = document.createElement("div");
  element.dataset.ehpeekOverlayHost = "true";
  parent.append(element);
  markUiRoot(element);

  const [uiScale, setScale] = createSignal(initialUiScale);
  let fullscreenScale = 1;
  const [fullscreenPixelScale, setFullscreenPixelScale] = createSignal(1);
  const applyScale = () => applyUiScale(uiScale(), element, fullscreenScale);
  const fullscreen = createFullscreenController(element, (factor) => {
    fullscreenScale = factor;
    setFullscreenPixelScale(factor);
    applyScale();
  });
  untrack(applyScale);

  return {
    element,
    texts,
    fullscreen,
    fullscreenPixelScale,
    uiScale,
    setUiScale: (scale) => {
      setScale(scale);
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
      <ReaderTextsProvider texts={host.texts}>{props.children}</ReaderTextsProvider>
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
