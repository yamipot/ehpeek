import type { JSX } from "solid-js";
import { render } from "solid-js/web";

const MANAGED_DOM_NODE_CLASS = "ehpeek-managed";
const EHPEEK_ANCHOR_ATTRIBUTE = "data-ehpeek-anchor";
const EH_SYRINGE_IGNORE_SELECTOR = ".eh-syringe-ignore";
const LONG_PRESS_DELAY_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
const mountedNodes = new WeakMap<HTMLElement, () => void>();
let managedDocumentElement: ManagedDomNode<HTMLElement> | null = null;
let managedBody: ManagedDomNode<HTMLElement> | null = null;

export type DomNodeFilter<TElement extends Element = Element> = (
  node: DomNode<TElement>,
) => boolean;

export type DomApply = Readonly<Record<string, string>>;
export interface DomChilds {
  readonly [name: string]: DomDescription;
}

type DomGroupBase = {
  readonly kind: "group";
  readonly childs: DomChilds;
};

type DomDefinitionBase = {
  readonly apply: DomApply;
  readonly childs: DomChilds;
  readonly kind: "node";
  readonly selector: string;
  readonly __element?: HTMLElement;
};

export type DomDescription = DomGroupBase | DomDefinitionBase;

export type DomGroup<TChilds extends DomChilds = DomChilds> = DomGroupBase & {
  readonly childs: TChilds;
} & TChilds;

export type DomDefinition<
  TElement extends HTMLElement = HTMLElement,
  TApply extends DomApply = DomApply,
  TChilds extends DomChilds = DomChilds,
> = {
  readonly apply: TApply;
  readonly childs: TChilds;
  readonly kind: "node";
  readonly selector: string;
  readonly __element?: TElement;
} & TChilds;

type DomOptions<
  TApply extends DomApply,
  TChilds extends DomChilds,
> = {
  readonly apply?: TApply;
  readonly childs?: TChilds;
};

type BoundDomChilds<TChilds extends DomChilds> = {
  readonly [TKey in keyof TChilds]: BoundDom<TChilds[TKey]>;
};

type BoundDomNode<
  TElement extends HTMLElement,
  TApply extends DomApply,
> = {
  all(): DomNode<TElement>[];
  clone(): ManagedDomNode<TElement, keyof TApply & string> | null;
  cloneAll(): ManagedDomNode<TElement, keyof TApply & string>[];
  inplace(): ManagedDomNode<TElement, keyof TApply & string> | null;
  inplaceAll(): ManagedDomNode<TElement, keyof TApply & string>[];
  move(): ManagedDomNode<TElement, keyof TApply & string> | null;
  moveAll(): ManagedDomNode<TElement, keyof TApply & string>[];
  one(): DomNode<TElement> | null;
};

export type BoundDom<TDescription extends DomDescription> =
  TDescription extends DomGroup<infer TChilds>
    ? BoundDomChilds<TChilds>
    : TDescription extends DomDefinition<infer TElement, infer TApply, infer TChilds>
      ? BoundDomNode<TElement, TApply> & BoundDomChilds<TChilds>
      : never;

const emptyDomApply = {} as const;
const emptyDomChilds = {} as const;

export function group<const TChilds extends DomChilds>(
  childs: TChilds,
): DomGroup<TChilds> {
  return Object.assign({ kind: "group" as const, childs }, childs);
}

function defineDomNode<TElement extends HTMLElement>() {
  return <
    const TApply extends DomApply = typeof emptyDomApply,
    const TChilds extends DomChilds = typeof emptyDomChilds,
  >(
    selector: string,
    options: DomOptions<TApply, TChilds> = {},
  ): DomDefinition<TElement, TApply, TChilds> => {
    const childs = options.childs ?? emptyDomChilds as TChilds;
    return Object.assign({
      apply: options.apply ?? emptyDomApply as TApply,
      childs,
      kind: "node" as const,
      selector,
    }, childs);
  };
}

export const query = defineDomNode<HTMLElement>();
export const anchor = defineDomNode<HTMLAnchorElement>();
export const area = defineDomNode<HTMLAreaElement>();
export const button = defineDomNode<HTMLButtonElement>();
export const cell = defineDomNode<HTMLTableCellElement>();
export const control = defineDomNode<HTMLInputElement | HTMLButtonElement>();
export const form = defineDomNode<HTMLFormElement>();
export const image = defineDomNode<HTMLImageElement>();
export const input = defineDomNode<HTMLInputElement>();
export const option = defineDomNode<HTMLOptionElement>();
export const row = defineDomNode<HTMLTableRowElement>();
export const script = defineDomNode<HTMLScriptElement>();
export const select = defineDomNode<HTMLSelectElement>();
export const table = defineDomNode<HTMLTableElement>();

export function cls<
  const TApply extends DomApply = typeof emptyDomApply,
  const TChilds extends DomChilds = typeof emptyDomChilds,
>(
  name: string,
  options: DomOptions<TApply, TChilds> = {},
): DomDefinition<HTMLElement, TApply, TChilds> {
  return query(`.${name}`, options);
}

export function id<
  const TApply extends DomApply = typeof emptyDomApply,
  const TChilds extends DomChilds = typeof emptyDomChilds,
>(
  name: string,
  options: DomOptions<TApply, TChilds> = {},
): DomDefinition<HTMLElement, TApply, TChilds> {
  return query(`#${name}`, options);
}

export function tag<
  const TTag extends keyof HTMLElementTagNameMap,
  const TApply extends DomApply = typeof emptyDomApply,
  const TChilds extends DomChilds = typeof emptyDomChilds,
>(
  name: TTag,
  options: DomOptions<TApply, TChilds> = {},
): DomDefinition<HTMLElementTagNameMap[TTag], TApply, TChilds> {
  return defineDomNode<HTMLElementTagNameMap[TTag]>()(name, options);
}

function domSelector(
  source: string | DomDefinition,
): string {
  return typeof source === "string" ? source : source.selector;
}

export function originalPageNode<TElement extends Element>(
  node: DomNode<TElement>,
): boolean {
  return node.closest(EH_SYRINGE_IGNORE_SELECTOR) === null;
}

export function anyDomNode(): boolean {
  return true;
}

export type ManagedDomElements = Record<
  string,
  ManagedDomNode<HTMLElement, string> | ManagedDomNode<HTMLElement, string>[] | null
>;

/** Creates a uniquely named managed mount for one component feature. */
export function createAnchor(
  name: string,
): ManagedDomNode<HTMLDivElement> | null {
  const selector = `[${EHPEEK_ANCHOR_ATTRIBUTE}="${CSS.escape(name)}"]`;
  if (document.querySelector(selector)) {
    return null;
  }

  const anchor = document.createElement("div");
  anchor.setAttribute(EHPEEK_ANCHOR_ATTRIBUTE, name);
  return DomNode.from(anchor).inplace();
}

/** Creates an EhPeek-owned managed element without touching original-page DOM. */
export function createManagedElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
): ManagedDomNode<HTMLElementTagNameMap[K]>;

export function createManagedElement<
  K extends keyof HTMLElementTagNameMap,
  const TApply extends DomApply,
>(
  tagName: K,
  apply: TApply,
): ManagedDomNode<HTMLElementTagNameMap[K], keyof TApply & string>;

export function createManagedElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  apply: DomApply = emptyDomApply,
): ManagedDomNode<HTMLElementTagNameMap[K], string> {
  return ManagedDomNode.from(document.createElement(tagName), apply);
}

/** Acquires the document element for page-level feature transforms. */
export function documentElement(): ManagedDomNode<HTMLElement> {
  managedDocumentElement ??= DomNode.from(document.documentElement).inplace();
  return managedDocumentElement;
}

/** Acquires the document body for page-level feature transforms. */
export function documentBody(): ManagedDomNode<HTMLElement> {
  managedBody ??= DomNode.from(document.body).inplace();
  return managedBody;
}

/**
 * Read-only access to original-page DOM before ownership is decided.
 * Selector queries exclude EhSyringe's retained copies unless the caller explicitly requests them for data extraction.
 */
export class DomNode<T extends ParentNode = ParentNode> {
  readonly #node: T;

  private constructor(node: T) {
    this.#node = node;
  }

  static from<T extends ParentNode>(node: T): DomNode<T> {
    return new DomNode(node);
  }

  use<const TDescription extends DomDescription>(
    description: TDescription,
  ): BoundDom<TDescription> {
    return bindDom(description, () => [this]);
  }

  one<
    TElement extends HTMLElement,
    TApply extends DomApply,
    TChilds extends DomChilds,
  >(
    source: DomDefinition<TElement, TApply, TChilds>,
    filter?: DomNodeFilter<TElement>,
  ): DomNode<TElement> | null;

  one<TElement extends Element = HTMLElement>(
    source: string,
    filter?: DomNodeFilter<TElement>,
  ): DomNode<TElement> | null;

  one<TElement extends Element = HTMLElement>(
    source: string | DomDefinition<TElement & HTMLElement>,
    filter: DomNodeFilter<TElement> = originalPageNode,
  ): DomNode<TElement> | null {
    return Array.from(
      this.#node.querySelectorAll<TElement>(domSelector(source)),
      DomNode.from,
    ).find(filter) ?? null;
  }

  all<
    TElement extends HTMLElement,
    TApply extends DomApply,
    TChilds extends DomChilds,
  >(
    source: DomDefinition<TElement, TApply, TChilds>,
    filter?: DomNodeFilter<TElement>,
  ): DomNode<TElement>[];

  all<TElement extends Element = HTMLElement>(
    source: string,
    filter?: DomNodeFilter<TElement>,
  ): DomNode<TElement>[];

  all<TElement extends Element = HTMLElement>(
    source: string | DomDefinition<TElement & HTMLElement>,
    filter: DomNodeFilter<TElement> = originalPageNode,
  ): DomNode<TElement>[] {
    return Array.from(this.#node.querySelectorAll<TElement>(domSelector(source)))
      .map(DomNode.from)
      .filter(filter);
  }

  parent(this: DomNode<Element>): DomNode<HTMLElement> | null {
    const parent = this.#node.parentElement;
    return parent ? DomNode.from(parent) : null;
  }

  children(this: DomNode<Element>): DomNode<HTMLElement>[] {
    return Array.from(this.#node.children, (child) => DomNode.from(child as HTMLElement));
  }

  closest<
    TElement extends HTMLElement,
    TApply extends DomApply,
    TChilds extends DomChilds,
  >(
    this: DomNode<Element>,
    source: DomDefinition<TElement, TApply, TChilds>,
  ): DomNode<TElement> | null;

  closest<TElement extends HTMLElement = HTMLElement>(
    this: DomNode<Element>,
    source: string,
  ): DomNode<TElement> | null;

  closest<TElement extends HTMLElement = HTMLElement>(
    this: DomNode<Element>,
    source: string | DomDefinition<TElement>,
  ): DomNode<TElement> | null {
    const element = this.#node.closest<TElement>(domSelector(source));
    return element ? DomNode.from(element) : null;
  }

  matches(this: DomNode<Element>, source: string | DomDefinition): boolean {
    return this.#node.matches(domSelector(source));
  }

  previous(this: DomNode<Element>): DomNode<HTMLElement> | null {
    const previous = this.#node.previousElementSibling;
    return previous instanceof HTMLElement ? DomNode.from(previous) : null;
  }

  form(this: DomNode<HTMLInputElement | HTMLButtonElement>): DomNode<HTMLFormElement> | null {
    return this.#node.form ? DomNode.from(this.#node.form) : null;
  }

  childElementCount(): number {
    return this.#node.childElementCount;
  }

  text(): string {
    return this.#node.textContent?.trim() ?? "";
  }

  attribute(this: DomNode<Element>, name: string): string | null {
    return this.#node.getAttribute(name);
  }

  hasAttribute(this: DomNode<Element>, name: string): boolean {
    return this.#node.hasAttribute(name);
  }

  attributeNames(this: DomNode<Element>): string[] {
    return this.#node.getAttributeNames();
  }

  hasClass(this: DomNode<Element>, className: string): boolean {
    return this.#node.classList.contains(className);
  }

  computedStyle(this: DomNode<Element>): CSSStyleDeclaration {
    return window.getComputedStyle(this.#node);
  }

  imageSize(this: DomNode<HTMLImageElement>): { height: number; width: number } {
    return {
      height: this.#node.naturalHeight || this.#node.height || Number(this.#node.getAttribute("height") || ""),
      width: this.#node.naturalWidth || this.#node.width || Number(this.#node.getAttribute("width") || ""),
    };
  }

  inputValue(this: DomNode<HTMLInputElement | HTMLSelectElement | HTMLOptionElement>): string {
    return this.#node.value;
  }

  checked(this: DomNode<HTMLInputElement>): boolean {
    return this.#node.checked;
  }

  selected(this: DomNode<HTMLOptionElement>): boolean {
    return this.#node.selected;
  }

  sameNode(other: DomNode): boolean {
    return this.#node === other.#node;
  }

  observe<TElement extends HTMLElement>(
    source: string | DomDefinition<TElement>,
    acquire: (node: DomNode<TElement>) => ManagedDomNode<TElement> | null,
    onManaged: (node: ManagedDomNode<TElement>) => void | (() => void),
    options: MutationObserverInit = { childList: true, subtree: true },
  ): () => void {
    const seen: DomNode<TElement>[] = [];
    const cleanups: Array<() => void> = [];
    const scan = () => {
      for (const node of this.all<TElement>(domSelector(source))) {
        if (seen.some((candidate) => candidate.sameNode(node))) {
          continue;
        }
        seen.push(node);
        const managed = acquire(node);
        if (!managed) {
          continue;
        }
        const cleanup = onManaged(managed);
        if (cleanup) {
          cleanups.push(cleanup);
        }
      }
    };
    const observer = new MutationObserver(scan);
    scan();
    observer.observe(this.#node, options);
    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  inplace(
    this: DomNode<T & HTMLElement>,
  ): ManagedDomNode<T & HTMLElement>;

  inplace<const TApply extends DomApply>(
    this: DomNode<T & HTMLElement>,
    apply: TApply,
  ): ManagedDomNode<T & HTMLElement, keyof TApply & string>;

  inplace(
    this: DomNode<T & HTMLElement>,
    apply: DomApply = emptyDomApply,
  ): ManagedDomNode<T & HTMLElement, string> {
    return ManagedDomNode.from(this.#node, apply);
  }

  move(this: DomNode<T & HTMLElement>): ManagedDomNode<T & HTMLElement>;

  move<const TApply extends DomApply>(
    this: DomNode<T & HTMLElement>,
    apply: TApply,
  ): ManagedDomNode<T & HTMLElement, keyof TApply & string>;

  move(
    this: DomNode<T & HTMLElement>,
    apply: DomApply = emptyDomApply,
  ): ManagedDomNode<T & HTMLElement, string> {
    const managed = this.inplace(apply);
    managed.remove();
    return managed;
  }

  clone(
    this: DomNode<T & HTMLElement>,
    deep?: boolean,
  ): ManagedDomNode<T & HTMLElement>;

  clone<const TApply extends DomApply>(
    this: DomNode<T & HTMLElement>,
    apply: TApply,
    deep?: boolean,
  ): ManagedDomNode<T & HTMLElement, keyof TApply & string>;

  clone(
    this: DomNode<T & HTMLElement>,
    applyOrDeep: DomApply | boolean = emptyDomApply,
    deep = true,
  ): ManagedDomNode<T & HTMLElement, string> {
    const apply = typeof applyOrDeep === "boolean" ? emptyDomApply : applyOrDeep;
    const cloneDeep = typeof applyOrDeep === "boolean" ? applyOrDeep : deep;
    return ManagedDomNode.from(
      this.#node.cloneNode(cloneDeep) as T & HTMLElement,
      apply,
    );
  }
}

function bindDom<const TDescription extends DomDescription>(
  description: TDescription,
  scopes: () => DomNode<ParentNode>[],
): BoundDom<TDescription> {
  const boundNode = description.kind === "group"
    ? null
    : bindDomNode(description, scopes);
  const bound = boundNode ?? {};
  const childScopes = description.kind === "group"
    ? scopes
    : () => boundNode?.all() ?? [];

  for (const [name, child] of Object.entries(description.childs)) {
    if (name in bound) {
      throw new Error(`Original DOM child name is reserved: ${name}`);
    }
    Object.assign(bound, { [name]: bindDom(child, childScopes) });
  }

  return bound as BoundDom<TDescription>;
}

function bindDomNode(
  description: DomDefinitionBase,
  scopes: () => DomNode<ParentNode>[],
): BoundDomNode<HTMLElement, DomApply> {
  const retained: DomNode<HTMLElement>[] = [];
  const all = () => {
    const current = scopes().flatMap((scope) => scope.all<HTMLElement>(description.selector));
    return [
      ...current,
      ...retained.filter((node) => !current.some((candidate) => candidate.sameNode(node))),
    ];
  };
  const retain = (nodes: DomNode<HTMLElement>[]) => {
    for (const node of nodes) {
      if (!retained.some((candidate) => candidate.sameNode(node))) {
        retained.push(node);
      }
    }
    return nodes;
  };

  return {
    all,
    clone: () => all()[0]?.clone(description.apply) ?? null,
    cloneAll: () => all().map((node) => node.clone(description.apply)),
    inplace: () => retain(all().slice(0, 1))[0]?.inplace(description.apply) ?? null,
    inplaceAll: () => retain(all()).map((node) => node.inplace(description.apply)),
    move: () => retain(all().slice(0, 1))[0]?.move(description.apply) ?? null,
    moveAll: () => retain(all()).map((node) => node.move(description.apply)),
    one: () => all()[0] ?? null,
  };
}

/** A node owned by EhPeek and therefore safe to mount or mutate. */
export class ManagedDomNode<
  T extends HTMLElement = HTMLElement,
  TApply extends string = never,
> {
  readonly Component: () => T;
  readonly #apply: DomApply;
  readonly #node: T;

  private constructor(element: T, apply: DomApply) {
    this.#apply = apply;
    this.#node = element;
    this.Component = () => this.#node;
  }

  static from<TElement extends HTMLElement>(
    element: TElement,
  ): ManagedDomNode<TElement>;

  static from<
    TElement extends HTMLElement,
    const TApply extends DomApply,
  >(
    element: TElement,
    apply: TApply,
  ): ManagedDomNode<TElement, keyof TApply & string>;

  static from<TElement extends HTMLElement>(
    element: TElement,
    apply: DomApply = emptyDomApply,
  ): ManagedDomNode<TElement, string> {
    if (__EHPEEK_DEBUG__) {
      element.classList.add(MANAGED_DOM_NODE_CLASS);
    }
    return new ManagedDomNode(element, apply);
  }

  apply(...names: TApply[]): this {
    const classes = names.map((name) => {
      const className = this.#apply[name];
      if (!className) {
        throw new Error(`Unknown original DOM application: ${name}`);
      }
      return className;
    });
    this.#node.classList.add(...classes);
    return this;
  }

  all<
    TElement extends HTMLElement,
    TDomApply extends DomApply,
    TChilds extends DomChilds,
  >(
    source: DomDefinition<TElement, TDomApply, TChilds>,
  ): ManagedDomNode<TElement, keyof TDomApply & string>[];

  all<TElement extends HTMLElement = HTMLElement>(
    source: string,
  ): ManagedDomNode<TElement>[];

  all<TElement extends HTMLElement = HTMLElement>(
    source: string | DomDefinition<TElement>,
  ): ManagedDomNode<TElement, string>[] {
    const apply = typeof source === "string" ? emptyDomApply : source.apply;
    return Array.from(
      this.#node.querySelectorAll<TElement>(domSelector(source)),
      (node) => ManagedDomNode.from(node, apply),
    );
  }

  rect(): DOMRect {
    return this.#node.getBoundingClientRect();
  }

  readAttribute(name: string): string | null {
    return this.#node.getAttribute(name);
  }

  setAttributes(values: Readonly<Record<string, string>>): this {
    for (const [name, value] of Object.entries(values)) {
      this.#node.setAttribute(name, value);
    }
    return this;
  }

  removeAttributes(...names: string[]): this {
    for (const name of names) {
      this.#node.removeAttribute(name);
    }
    return this;
  }

  addClasses(...names: string[]): this {
    this.#node.classList.add(...names);
    return this;
  }

  removeClasses(...names: string[]): this {
    this.#node.classList.remove(...names);
    return this;
  }

  replaceClasses(value: string): this {
    this.#node.className = value;
    return this;
  }

  styles(values: Readonly<Record<string, string>>, priority = ""): this {
    for (const [property, value] of Object.entries(values)) {
      this.#node.style.setProperty(property, value, priority);
    }
    return this;
  }

  removeStyles(...properties: string[]): this {
    for (const property of properties) {
      this.#node.style.removeProperty(property);
    }
    return this;
  }

  removeAllStyles(): this {
    this.#node.removeAttribute("style");
    return this;
  }

  attribute(name: string, value: string): this {
    this.#node.setAttribute(name, value);
    return this;
  }

  click(): void {
    this.#node.click();
  }

  mount(view: () => JSX.Element): void {
    mountedNodes.get(this.#node)?.();
    this.#node.replaceChildren();
    mountedNodes.set(this.#node, render(view, this.#node));
  }

  remove(): void {
    mountedNodes.get(this.#node)?.();
    mountedNodes.delete(this.#node);
    this.#node.remove();
  }

  replaceWith(replacement: ManagedDomNode | Node): void {
    this.#node.replaceWith(
      replacement instanceof ManagedDomNode ? replacement.#node : replacement,
    );
  }

  before(sibling: ManagedDomNode | Node): void {
    this.#node.before(sibling instanceof ManagedDomNode ? sibling.#node : sibling);
  }

  after(sibling: ManagedDomNode | Node): void {
    this.#node.after(sibling instanceof ManagedDomNode ? sibling.#node : sibling);
  }

  append(...children: ManagedDomNode[]): this {
    this.#node.append(...children.map((child) => child.#node));
    return this;
  }

  prepend(child: ManagedDomNode | Node): void {
    this.#node.prepend(child instanceof ManagedDomNode ? child.#node : child);
  }

  setTextUnlessInput(text: string): void {
    if (!(this.#node instanceof HTMLInputElement)) {
      this.#node.textContent = text;
    }
  }

  setHidden(hidden: boolean): this {
    this.#node.hidden = hidden;
    return this;
  }

  replaceChildren(...children: Array<ManagedDomNode | Node>): void {
    this.#node.replaceChildren(...children.map((child) => child instanceof ManagedDomNode ? child.#node : child));
  }

  listen<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    this.#node.addEventListener(type, listener, options);
    return () => this.#node.removeEventListener(type, listener, options);
  }

  listenLongPress(
    listener: (event: PointerEvent) => void,
    shouldStart: (event: PointerEvent) => boolean = () => true,
  ): () => void {
    let timer: number | null = null;
    let press: { event: PointerEvent; x: number; y: number } | null = null;
    let suppressClick = false;
    let suppressClickTimer: number | null = null;
    const cancel = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      press = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !shouldStart(event)) {
        return;
      }
      cancel();
      press = { event, x: event.clientX, y: event.clientY };
      timer = window.setTimeout(() => {
        const completed = press;
        cancel();
        if (!completed) {
          return;
        }
        suppressClick = true;
        listener(completed.event);
        suppressClickTimer = window.setTimeout(() => {
          suppressClick = false;
          suppressClickTimer = null;
        }, 1_000);
      }, LONG_PRESS_DELAY_MS);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (
        press?.event.pointerId === event.pointerId &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >
          LONG_PRESS_MOVE_TOLERANCE_PX
      ) {
        cancel();
      }
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (press?.event.pointerId === event.pointerId) {
        cancel();
      }
    };
    const onContextMenu = (event: MouseEvent) => {
      if (press || suppressClick) {
        event.preventDefault();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) {
        return;
      }
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const cleanups = [
      this.listen("pointerdown", onPointerDown),
      this.listen("pointermove", onPointerMove),
      this.listen("pointerup", onPointerEnd),
      this.listen("pointercancel", onPointerEnd),
      this.listen("contextmenu", onContextMenu),
      this.listen("click", onClick, true),
    ];
    return () => {
      cancel();
      if (suppressClickTimer !== null) {
        window.clearTimeout(suppressClickTimer);
      }
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  observe(
    onChange: () => void,
    options: MutationObserverInit = { childList: true, subtree: true },
  ): () => void {
    const observer = new MutationObserver(onChange);
    observer.observe(this.#node, options);
    return () => observer.disconnect();
  }

  focus(this: ManagedDomNode<HTMLElement>): void {
    this.#node.focus();
  }

  scrollIntoView(options?: ScrollIntoViewOptions): void {
    this.#node.scrollIntoView(options);
  }

  isNode(node: Node): boolean {
    return this.#node === node;
  }

  contains(node: Node): boolean {
    return this.#node.contains(node);
  }

  matches(source: string | DomDefinition): boolean {
    return this.#node.matches(domSelector(source));
  }

  copyAttributesTo(target: ManagedDomNode): void {
    for (const attribute of Array.from(this.#node.attributes)) {
      target.#node.setAttribute(attribute.name, attribute.value);
    }
  }

  setInputValue(this: ManagedDomNode<HTMLInputElement>, value: string): void {
    this.#node.value = value;
  }

  inputValue(this: ManagedDomNode<HTMLInputElement | HTMLSelectElement | HTMLOptionElement>): string {
    return this.#node.value;
  }

  setSelected(this: ManagedDomNode<HTMLOptionElement>, selected: boolean): void {
    this.#node.selected = selected;
  }

  dispatchInput(this: ManagedDomNode<HTMLInputElement>): void {
    this.#node.dispatchEvent(new Event("input", { bubbles: true }));
  }

  mirrorContentTo(target: HTMLElement): () => void {
    const update = () => {
      target.replaceChildren(
        ...Array.from(this.#node.childNodes, (node) => node.cloneNode(true)),
      );
      const language = this.#node.getAttribute("lang");
      if (language) {
        target.setAttribute("lang", language);
      } else {
        target.removeAttribute("lang");
      }
    };
    update();
    return this.observe(update, {
      attributes: true,
      attributeFilter: ["lang"],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
}
