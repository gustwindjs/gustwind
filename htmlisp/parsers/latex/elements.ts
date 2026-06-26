import type { Element } from "../../types.ts";

function el(type: string) {
  return function e(children: string[]) {
    return element(type, children);
  };
}

function element(
  type: string,
  children: (Element | string)[],
  attributes?: Record<string, string>,
): Element {
  return {
    type,
    attributes: attributes || {},
    children,
  };
}

function childrenToText(children: (Element | string)[]): string {
  return children
    .map((child) =>
      typeof child === "string" ? child : childrenToText(child.children || []),
    )
    .join("");
}

export { childrenToText, el, element };
