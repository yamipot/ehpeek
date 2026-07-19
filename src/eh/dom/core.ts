import type { JSX } from "solid-js";
import { render } from "solid-js/web";

export type ElemChanges = {
  attributes?: {
    remove?: readonly string[];
    set?: Readonly<Record<string, string>>;
  };
  classes?: {
    add?: readonly string[];
    remove?: readonly string[];
    replace?: string;
  };
  hidden?: boolean;
  styles?: {
    remove?: "all" | readonly string[];
    set?: Readonly<Record<string, string>>;
  };
};

export const MANAGED_DOM_NODE_CLASS = "ehpeek-managed";
const EHPEEK_ANCHOR_ATTRIBUTE = "data-ehpeek-anchor";
const mountedNodes = new WeakMap<HTMLElement, () => void>();
const managedNodes = new WeakMap<HTMLElement, ManagedDomNode>();
let managedDocumentElement: ManagedDomNode<HTMLElement> | null = null;
let managedBody: ManagedDomNode<HTMLElement> | null = null;
let managedHead: ManagedDomNode<HTMLHeadElement> | null = null;

export type ManagedDomElements = Record<
  string,
  ManagedDomNode | ManagedDomNode[] | null
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
): ManagedDomNode<HTMLElementTagNameMap[K]> {
  return ManagedDomNode.from(manageElem(document.createElement(tagName)));
}

/** Acquires the document element for page-level feature transforms. */
export function documentElement(): ManagedDomNode<HTMLElement> | null {
  managedDocumentElement ??= DomNode.from(document.documentElement).inplace();
  return managedDocumentElement;
}

/** Acquires the document body for page-level feature transforms. */
export function documentBody(): ManagedDomNode<HTMLElement> | null {
  managedBody ??= DomNode.from(document.body).inplace();
  return managedBody;
}

/** Acquires the document head for feature styles and metadata transforms. */
export function documentHead(): ManagedDomNode<HTMLHeadElement> | null {
  managedHead ??= DomNode.from(document.head).inplace();
  return managedHead;
}

/** Read-only access to an original-page node before ownership is decided. */
export class DomNode<T extends ParentNode = ParentNode> {
  readonly #node: T;

  private constructor(node: T) {
    this.#node = node;
  }

  static from<T extends ParentNode>(node: T): DomNode<T> {
    return new DomNode(node);
  }

  one<TElement extends Element = HTMLElement>(
    selector: string,
  ): DomNode<TElement> | null {
    const element = this.#node.querySelector<TElement>(selector);
    return element ? DomNode.from(element) : null;
  }

  all<TElement extends Element = HTMLElement>(
    selector: string,
  ): DomNode<TElement>[] {
    return Array.from(
      this.#node.querySelectorAll<TElement>(selector),
      DomNode.from,
    );
  }

  parent(this: DomNode<Element>): DomNode<HTMLElement> | null {
    const parent = this.#node.parentElement;
    return parent ? DomNode.from(parent) : null;
  }

  children(this: DomNode<Element>): DomNode<HTMLElement>[] {
    return Array.from(this.#node.children, (child) => DomNode.from(child as HTMLElement));
  }

  closest<TElement extends HTMLElement = HTMLElement>(
    this: DomNode<Element>,
    selector: string,
  ): DomNode<TElement> | null {
    const element = this.#node.closest<TElement>(selector);
    return element ? DomNode.from(element) : null;
  }

  matches(this: DomNode<Element>, selector: string): boolean {
    return this.#node.matches(selector);
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

  inlineStyle(this: DomNode<HTMLElement>, property: string): string {
    return this.#node.style.getPropertyValue(property);
  }

  rect(this: DomNode<Element>): DOMRect {
    return this.#node.getBoundingClientRect();
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

  manageable(this: DomNode<HTMLElement>): boolean {
    return !this.#node.classList.contains(MANAGED_DOM_NODE_CLASS);
  }

  owned(this: DomNode<T & HTMLElement>): ManagedDomNode<T & HTMLElement> | null {
    return (managedNodes.get(this.#node) as ManagedDomNode<T & HTMLElement> | undefined) ?? null;
  }

  sameNode(other: DomNode): boolean {
    return this.#node === other.#node;
  }

  observe<TElement extends HTMLElement>(
    selector: string,
    acquire: (node: DomNode<TElement>) => ManagedDomNode<TElement> | null,
    onManaged: (node: ManagedDomNode<TElement>) => void | (() => void),
    options: MutationObserverInit = { childList: true, subtree: true },
  ): () => void {
    const seen: DomNode<TElement>[] = [];
    const cleanups: Array<() => void> = [];
    const scan = () => {
      for (const node of this.all<TElement>(selector)) {
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
  ): ManagedDomNode<T & HTMLElement> | null {
    if (this.#node.classList.contains(MANAGED_DOM_NODE_CLASS)) {
      return null;
    }
    return ManagedDomNode.from(manageElem(this.#node));
  }

  move(this: DomNode<T & HTMLElement>): ManagedDomNode<T & HTMLElement> | null {
    const managed = this.inplace();
    managed?.remove();
    return managed;
  }

  clone(
    this: DomNode<T & HTMLElement>,
    deep = true,
  ): ManagedDomNode<T & HTMLElement> | null {
    if (this.#node.classList.contains(MANAGED_DOM_NODE_CLASS)) {
      return null;
    }
    return ManagedDomNode.from(
      manageElem(this.#node.cloneNode(deep) as T & HTMLElement),
    );
  }
}

/** A node owned by EhPeek and therefore safe to mount or mutate. */
export class ManagedDomNode<T extends HTMLElement = HTMLElement> {
  readonly Component: () => T;
  readonly #node: T;

  private constructor(element: T) {
    this.#node = element;
    this.Component = () => this.#node;
  }

  static from<TElement extends HTMLElement>(
    element: TElement,
  ): ManagedDomNode<TElement> {
    const existing = managedNodes.get(element) as ManagedDomNode<TElement> | undefined;
    if (existing) {
      return existing;
    }
    const managed = new ManagedDomNode(element);
    managedNodes.set(element, managed);
    return managed;
  }

  transform(changes: ElemChanges): this {
    changeElem(this.#node, changes);
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

  appendContent(...children: Array<Node | string>): this {
    this.#node.append(...children);
    return this;
  }

  setTextUnlessInput(text: string): void {
    if (!(this.#node instanceof HTMLInputElement)) {
      this.#node.textContent = text;
    }
  }

  setHidden(hidden: boolean): void {
    this.#node.hidden = hidden;
  }

  replaceChildren(...children: Array<ManagedDomNode | Node>): void {
    this.#node.replaceChildren(...children.map((child) => child instanceof ManagedDomNode ? child.#node : child));
  }

  listen<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.#node.addEventListener(type, listener, options);
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

  copyAttributesTo(target: Element): void {
    for (const attribute of Array.from(this.#node.attributes)) {
      target.setAttribute(attribute.name, attribute.value);
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

  setDisabled(
    this: ManagedDomNode<HTMLInputElement | HTMLButtonElement>,
    disabled: boolean,
  ): void {
    this.#node.disabled = disabled;
  }

  dispatchInput(this: ManagedDomNode<HTMLInputElement>): void {
    this.#node.dispatchEvent(new Event("input", { bubbles: true }));
  }

  requestSubmit(
    this: ManagedDomNode<HTMLFormElement>,
    submitter: ManagedDomNode<HTMLInputElement | HTMLButtonElement>,
  ): void {
    this.#node.requestSubmit(submitter.#node);
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

function manageElem<T extends HTMLElement>(element: T): T {
  element.classList.add(MANAGED_DOM_NODE_CLASS);
  return element;
}

function changeElem<T extends HTMLElement>(
  element: T,
  changes: ElemChanges,
): T {
  for (const name of changes.attributes?.remove ?? []) {
    element.removeAttribute(name);
  }
  for (const [name, value] of Object.entries(changes.attributes?.set ?? {})) {
    element.setAttribute(name, value);
  }

  if (changes.classes?.replace !== undefined) {
    element.className = changes.classes.replace;
  }
  element.classList.remove(...(changes.classes?.remove ?? []));
  element.classList.add(...(changes.classes?.add ?? []));

  if (changes.styles?.remove === "all") {
    element.removeAttribute("style");
  } else {
    for (const property of changes.styles?.remove ?? []) {
      element.style.removeProperty(property);
    }
  }
  for (const [property, value] of Object.entries(changes.styles?.set ?? {})) {
    element.style.setProperty(property, value);
  }
  if (!element.getAttribute("style")?.trim()) {
    element.removeAttribute("style");
  }

  if (changes.hidden !== undefined) {
    element.hidden = changes.hidden;
  }
  element.classList.add(MANAGED_DOM_NODE_CLASS);
  return element;
}
