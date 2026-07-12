type DataValue = boolean | number | string;
type Child = Node | string | number | boolean | null | undefined;
type Props = Record<string, unknown> & {
  children?: Child | Child[];
  className?: string;
  ref?: (node: HTMLElement) => void;
};

type DataBinding = {
  readonly ehpeekDataBinding: true;
  apply(element: HTMLElement, attributeName: string): void;
};

export class DomData<T extends DataValue> {
  private element: HTMLElement | null = null;
  private key: string | null = null;
  private defaultValue: T | null = null;

  get value(): T {
    const value = this.element?.dataset[this.requiredKey()];

    if (value === undefined) {
      return this.requiredDefaultValue();
    }

    if (typeof this.requiredDefaultValue() === "boolean") {
      return (value === "true") as T;
    }

    if (typeof this.requiredDefaultValue() === "number") {
      return Number(value) as T;
    }

    return value as T;
  }

  set value(value: T) {
    const element = this.requiredElement();
    element.dataset[this.requiredKey()] = String(value);
  }

  clear(): void {
    const element = this.requiredElement();
    delete element.dataset[this.requiredKey()];
  }

  bind(defaultValue: T): DataBinding {
    this.defaultValue = defaultValue;

    return {
      ehpeekDataBinding: true,
      apply: (element, attributeName) => {
        this.element = element;
        this.key = datasetKeyFromAttribute(attributeName);

        if (element.dataset[this.key] === undefined) {
          this.value = defaultValue;
        }
      },
    };
  }

  bindElement(element: HTMLElement, key: string, defaultValue: T): void {
    this.defaultValue = defaultValue;
    this.element = element;
    this.key = key;

    if (element.dataset[key] === undefined) {
      this.value = defaultValue;
    }
  }

  private requiredDefaultValue(): T {
    if (this.defaultValue === null) {
      throw new Error("DomData is not bound.");
    }

    return this.defaultValue;
  }

  private requiredElement(): HTMLElement {
    if (!this.element) {
      throw new Error("DomData is not bound.");
    }

    return this.element;
  }

  private requiredKey(): string {
    if (!this.key) {
      throw new Error("DomData is not bound.");
    }

    return this.key;
  }
}

export function h(tag: string, props: Props | null, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);

  if (props) {
    applyProps(node, props);
  }

  appendChildren(node, children);
  props?.ref?.(node);

  return node;
}

function applyProps(node: HTMLElement, props: Props): void {
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "ref" || value === undefined || value === null || value === false) {
      continue;
    }

    if (name === "className") {
      node.className = String(value);
      continue;
    }

    if (isDataBinding(value)) {
      value.apply(node, name);
      continue;
    }

    if (name.startsWith("on") && typeof value === "function") {
      node.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        node.setAttribute(name, "");
      }
      continue;
    }

    if (name in node) {
      (node as unknown as Record<string, unknown>)[name] = value;
    } else {
      node.setAttribute(name, String(value));
    }
  }
}

function appendChildren(parent: Node, children: Child[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || typeof child === "boolean") {
      continue;
    }

    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

function isDataBinding(value: unknown): value is DataBinding {
  return Boolean(value && typeof value === "object" && (value as DataBinding).ehpeekDataBinding === true);
}

function datasetKeyFromAttribute(attributeName: string): string {
  if (!attributeName.startsWith("data-")) {
    throw new Error(`DomData can only bind data-* attributes: ${attributeName}`);
  }

  return attributeName
    .slice("data-".length)
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
