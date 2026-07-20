import texts from "../../texts.json";

export function ReadButton(props: {
  currentPage: number;
  hasHistory: boolean;
  totalPages: number | null;
  onClick: () => void;
  variant: "gallery" | "touchGallery";
}) {
  const buttonClassName = () =>
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700"
      : "ehpeek-continue-reading block box-border w-full max-w-full mt-xs min-h-sm py-xs px-sm rounded-sm border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-center font-sans textsize-md font-700 leading-[1.15]";
  const detailClassName = () =>
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case"
      : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-sm font-600";

  return (
    <button
      type="button"
      class={buttonClassName()}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.hasHistory
        ? texts.reader.continueReading
        : texts.reader.startReading}
      <span class={detailClassName()}>
        {props.totalPages
          ? `${props.currentPage}/${props.totalPages}`
          : String(props.currentPage)}
      </span>
    </button>
  );
}
