import { clamp } from "../../utils";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const CLOSE_SCALE = 1.02;

export type ZoomOverlayImage = {
  pageNum: number;
  imageUrl: string;
  width: number | null;
  height: number | null;
};

export type ZoomPinchStart = {
  centerX: number;
  centerY: number;
};

export type ZoomPinchMove = ZoomPinchStart & {
  scale: number;
};

export type ZoomDragMove = {
  dx: number;
  dy: number;
};

type ZoomOverlayDom = {
  element: HTMLElement;
  image: HTMLImageElement;
};

function createZoomOverlayDom(): ZoomOverlayDom {
  const element = document.createElement("div");
  const image = document.createElement("img");

  element.className = "fixed inset-0 z-4 flex items-center justify-center overflow-hidden bg-[#070707] pointer-events-none";
  element.hidden = true;
  element.style.display = "none";
  image.className = "block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]";
  element.append(image);
  return {
    element,
    image,
  };
}

export type ZoomOverlay = ReturnType<typeof createZoomOverlay>;

export function createZoomOverlay() {
  const dom = createZoomOverlayDom();
  let activeImage: ZoomOverlayImage | null = null;
  let scale = 1;
  let requestedScale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let pinchStartScale = 1;
  let pinchStartOffsetX = 0;
  let pinchStartOffsetY = 0;
  let pinchStartCenterX = 0;
  let pinchStartCenterY = 0;
  let dragStartOffsetX = 0;
  let dragStartOffsetY = 0;
  const active = () => activeImage !== null;
  const renderTransform = () => {
    dom.image.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
  };
  const close = () => {
    activeImage = null;
    dom.element.hidden = true;
    dom.element.style.display = "none";
    dom.image.removeAttribute("src");
  };
  const startPinch = (pinch: ZoomPinchStart) => {
    pinchStartScale = scale;
    pinchStartOffsetX = offsetX;
    pinchStartOffsetY = offsetY;
    pinchStartCenterX = pinch.centerX;
    pinchStartCenterY = pinch.centerY;
  };

  return {
    element: dom.element,
    active,
    start(image: ZoomOverlayImage, pinch: ZoomPinchStart): void {
      activeImage = image;
      scale = 1;
      requestedScale = 1;
      offsetX = 0;
      offsetY = 0;
      dom.image.src = image.imageUrl;
      dom.image.alt = `Page ${image.pageNum}`;

      if (image.width && image.height) {
        dom.image.width = image.width;
        dom.image.height = image.height;
      } else {
        dom.image.removeAttribute("width");
        dom.image.removeAttribute("height");
      }

      dom.element.hidden = false;
      dom.element.style.display = "";
      startPinch(pinch);
      renderTransform();
    },
    startPinch,
    movePinch(pinch: ZoomPinchMove): void {
      if (!active()) {
        return;
      }

      requestedScale = pinchStartScale * pinch.scale;
      scale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);

      const rect = dom.element.getBoundingClientRect();
      const viewportCenterX = rect.left + rect.width / 2;
      const viewportCenterY = rect.top + rect.height / 2;
      const ratio = scale / pinchStartScale;
      offsetX = pinch.centerX - viewportCenterX - (pinchStartCenterX - viewportCenterX - pinchStartOffsetX) * ratio;
      offsetY = pinch.centerY - viewportCenterY - (pinchStartCenterY - viewportCenterY - pinchStartOffsetY) * ratio;
      renderTransform();
    },

    endPinch(): void {
      if (requestedScale <= CLOSE_SCALE) {
        close();
        return;
      }

      renderTransform();
    },

    startDrag(): void {
      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;
    },

    moveDrag(move: ZoomDragMove): void {
      if (!active()) {
        return;
      }

      offsetX = dragStartOffsetX + move.dx;
      offsetY = dragStartOffsetY + move.dy;
      renderTransform();
    },
    close,
  };
}
