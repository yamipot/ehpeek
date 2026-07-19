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

export type ManagedDomElements = Record<
  string,
  ManagedDomNode | ManagedDomNode[] | null
>;

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

  text(): string {
    return this.#node.textContent?.trim() ?? "";
  }

  attribute(this: DomNode<Element>, name: string): string | null {
    return this.#node.getAttribute(name);
  }

  hasAttribute(this: DomNode<Element>, name: string): boolean {
    return this.#node.hasAttribute(name);
  }

  hasClass(this: DomNode<Element>, className: string): boolean {
    return this.#node.classList.contains(className);
  }

  computedStyle(this: DomNode<Element>): CSSStyleDeclaration {
    return window.getComputedStyle(this.#node);
  }

  manageable(this: DomNode<HTMLElement>): boolean {
    return !this.#node.classList.contains(MANAGED_DOM_NODE_CLASS);
  }

  sameNode(other: DomNode): boolean {
    return this.#node === other.#node;
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
    return new ManagedDomNode(element);
  }

  transform(changes: ElemChanges): this {
    changeElem(this.#node, changes);
    return this;
  }

  mount(view: () => JSX.Element): void {
    mountedNodes.get(this.#node)?.();
    this.#node.replaceChildren();
    mountedNodes.set(this.#node, render(view, this.#node));
  }

  place(placement: (node: T) => boolean): boolean {
    return placement(this.#node);
  }

  clone(deep = true): ManagedDomNode<T> {
    return ManagedDomNode.from(manageElem(this.#node.cloneNode(deep) as T));
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

  prepend(child: ManagedDomNode | Node): void {
    this.#node.prepend(child instanceof ManagedDomNode ? child.#node : child);
  }

  setTextUnlessInput(text: string): void {
    if (!(this.#node instanceof HTMLInputElement)) {
      this.#node.textContent = text;
    }
  }

  focus(this: ManagedDomNode<HTMLElement>): void {
    this.#node.focus();
  }

  scrollIntoView(options?: ScrollIntoViewOptions): void {
    this.#node.scrollIntoView(options);
  }

  isConnected(): boolean {
    return this.#node.isConnected;
  }

  isNode(node: Node): boolean {
    return this.#node === node;
  }

  copyAttributesTo(target: Element): void {
    for (const attribute of Array.from(this.#node.attributes)) {
      target.setAttribute(attribute.name, attribute.value);
    }
  }

  inputValue(this: ManagedDomNode<HTMLInputElement>): string {
    return this.#node.value;
  }

  replaceInput(
    this: ManagedDomNode<HTMLInputElement>,
    replacement: HTMLInputElement,
  ): ManagedDomNode<HTMLInputElement> {
    this.#node.replaceWith(replacement);
    return ManagedDomNode.from(manageElem(replacement));
  }

  mirrorContentTo(target: HTMLElement): () => void {
    const update = () => {
      target.replaceChildren(
        ...Array.from(this.#node.childNodes, (node) => node.cloneNode(true)),
      );
      const language = this.#node.getAttribute("lang");
      language
        ? target.setAttribute("lang", language)
        : target.removeAttribute("lang");
    };
    const observer = new MutationObserver(update);
    update();
    observer.observe(this.#node, {
      attributes: true,
      attributeFilter: ["lang"],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
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
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
