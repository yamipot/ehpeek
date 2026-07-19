import { createSignal, untrack } from "solid-js";
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

type ZoomPinchStart = {
  centerX: number;
  centerY: number;
};

type ZoomPinchMove = ZoomPinchStart & {
  scale: number;
};

type ZoomDragMove = {
  dx: number;
  dy: number;
};

export type ZoomOverlayActions = {
  endPinch: () => void;
  moveDrag: (move: ZoomDragMove) => void;
  movePinch: (pinch: ZoomPinchMove) => void;
  reset: (pinch: ZoomPinchStart) => void;
  startDrag: () => void;
  startPinch: (pinch: ZoomPinchStart) => void;
};

export function ZoomOverlay(props: {
  actionsRef: (actions: ZoomOverlayActions) => void;
  image: ZoomOverlayImage | null;
  onClose: () => void;
}) {
  const [transform, setTransform] = createSignal("translate3d(0px, 0px, 0) scale(1)");
  let element!: HTMLDivElement;
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

  const renderTransform = () => {
    setTransform(`translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`);
  };
  const startPinch = (pinch: ZoomPinchStart) => {
    pinchStartScale = scale;
    pinchStartOffsetX = offsetX;
    pinchStartOffsetY = offsetY;
    pinchStartCenterX = pinch.centerX;
    pinchStartCenterY = pinch.centerY;
  };
  const actions: ZoomOverlayActions = {
    reset(pinch): void {
      scale = 1;
      requestedScale = 1;
      offsetX = 0;
      offsetY = 0;
      startPinch(pinch);
      renderTransform();
    },
    startPinch,
    movePinch(pinch): void {
      if (!props.image) {
        return;
      }

      requestedScale = pinchStartScale * pinch.scale;
      scale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);

      const rect = element.getBoundingClientRect();
      const viewportCenterX = rect.left + rect.width / 2;
      const viewportCenterY = rect.top + rect.height / 2;
      const ratio = scale / pinchStartScale;
      offsetX = pinch.centerX - viewportCenterX - (pinchStartCenterX - viewportCenterX - pinchStartOffsetX) * ratio;
      offsetY = pinch.centerY - viewportCenterY - (pinchStartCenterY - viewportCenterY - pinchStartOffsetY) * ratio;
      renderTransform();
    },
    endPinch(): void {
      if (requestedScale <= CLOSE_SCALE) {
        props.onClose();
        return;
      }

      renderTransform();
    },
    startDrag(): void {
      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;
    },
    moveDrag(move): void {
      if (!props.image) {
        return;
      }

      offsetX = dragStartOffsetX + move.dx;
      offsetY = dragStartOffsetY + move.dy;
      renderTransform();
    },
  };

  untrack(() => props.actionsRef(actions));

  return (
    <div
      ref={element}
      class="fixed inset-0 z-4 flex items-center justify-center overflow-hidden ehp-color-reader pointer-events-none"
      hidden={!props.image}
      style={{ display: props.image ? "" : "none" }}
    >
      <img
        class="block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]"
        src={props.image?.imageUrl}
        alt={props.image ? `Page ${props.image.pageNum}` : ""}
        width={props.image?.width ?? undefined}
        height={props.image?.height ?? undefined}
        style={{ transform: transform() }}
      />
    </div>
  );
}
