import type { JSX } from "solid-js";

export interface ReaderPageViewProps {
  /** Reading page; values outside the content range render a blank slot or the end screen. */
  pageNum: number;
}

/**
 * Displays the resource, placeholder or retry action for one page from Context.loading.
 * Viewport owns the surrounding frame's dimensions and ordering; this view owns its DOM attachment.
 */
export declare function ReaderPageView(props: ReaderPageViewProps): JSX.Element;
