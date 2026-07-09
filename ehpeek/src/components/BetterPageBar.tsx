import { h } from "../jsx";
import { clamp } from "../utils";

export const BETTER_PAGE_BAR_CLASS = "ehpeek-better-page-bar";
export const BETTER_PAGE_BAR_TOP_CLASS = "ehpeek-better-page-bar-top";
export const BETTER_PAGE_BAR_BOTTOM_CLASS = "ehpeek-better-page-bar-bottom";

export type BetterPageBarOptions = {
  currentIndex: number;
  maxIndex: number | null;
  top: boolean;
  urlForIndex: (index: number) => string;
};

export class BetterPageBar {
  readonly element: HTMLTableElement;

  constructor(options: BetterPageBarOptions) {
    const maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex);
    const currentIndex = clamp(options.currentIndex, 0, maxIndex);

    this.element = (
      <table className={`${BETTER_PAGE_BAR_CLASS} ${options.top ? BETTER_PAGE_BAR_TOP_CLASS : BETTER_PAGE_BAR_BOTTOM_CLASS}`}>
        <tbody>
          <tr>
            {this.linkCell("<", Math.max(0, currentIndex - 1), currentIndex === 0, options.urlForIndex)}
            {pageIndexes(currentIndex, maxIndex).map((pageIndex) =>
              pageIndex === null ? this.jumpCell() : this.linkCell(String(pageIndex + 1), pageIndex, pageIndex === currentIndex, options.urlForIndex),
            )}
            {this.linkCell(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex, options.urlForIndex)}
          </tr>
        </tbody>
      </table>
    ) as HTMLTableElement;
  }

  private linkCell(text: string, pageIndex: number, current: boolean, urlForIndex: (index: number) => string): HTMLTableCellElement {
    if (current) {
      return (
        <td className="ptds">
          <span>{text}</span>
        </td>
      ) as HTMLTableCellElement;
    }

    return (
      <td>
        <a href={urlForIndex(pageIndex)} data-page-index={String(pageIndex)}>
          {text}
        </a>
      </td>
    ) as HTMLTableCellElement;
  }

  private jumpCell(): HTMLTableCellElement {
    return (
      <td>
        <button type="button" data-page-jump="true">
          ...
        </button>
      </td>
    ) as HTMLTableCellElement;
  }
}

function pageIndexes(currentIndex: number, maxIndex: number): Array<number | null> {
  const indexes = new Set<number>([0, maxIndex]);

  for (let index = currentIndex - 2; index <= currentIndex + 2; index += 1) {
    if (index >= 0 && index <= maxIndex) {
      indexes.add(index);
    }
  }

  const sorted = Array.from(indexes).sort((left, right) => left - right);
  const output: Array<number | null> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      output.push(null);
    }

    output.push(sorted[index]);
  }

  return output;
}
