import { getAttributeBindings } from "./getAttributeBindings.ts";
import type { Element, HtmlispRenderOptions } from "../types.ts";
import { renderTextValue } from "./runtime.ts";

function renderElement(
  parsedAttributes: Record<string, unknown> & { children?: unknown },
  tag: Element,
  renderedChildren: string,
  renderOptions?: HtmlispRenderOptions,
) {
  const parsedChildren = parsedAttributes.children;
  const { type, closesWith } = tag;
  const isFragment = type === "noop" || type === "fragment";

  if (isSelfClosingElement(isFragment, parsedChildren, closesWith)) {
    return renderSelfClosingElement(
      type,
      parsedAttributes,
      closesWith,
      renderOptions,
    );
  }

  const content = renderTextValue(parsedChildren, renderOptions).concat(
    renderedChildren,
  );

  if (isFragment && (type === "fragment" || !parsedAttributes.type)) {
    return content;
  }

  const t = type === "noop" && parsedAttributes.type || type;

  if (!t) {
    return content;
  }

  return renderNormalElement(
    String(t),
    type,
    parsedAttributes,
    content,
    renderOptions,
  );
}

function isSelfClosingElement(
  isFragment: boolean,
  parsedChildren: unknown,
  closesWith: Element["closesWith"],
): closesWith is string {
  return !isFragment && !parsedChildren && typeof closesWith === "string";
}

function renderSelfClosingElement(
  type: string,
  parsedAttributes: Record<string, unknown>,
  closesWith: string,
  renderOptions?: HtmlispRenderOptions,
) {
  return `<${type}${
    getAttributeBindings(parsedAttributes, renderOptions)
  }${closesWith}>`;
}

function renderNormalElement(
  renderedType: string,
  originalType: string,
  parsedAttributes: Record<string, unknown>,
  content: string,
  renderOptions?: HtmlispRenderOptions,
) {
  if (originalType === "noop") {
    delete parsedAttributes.type;
  }

  return `<${renderedType}${
    getAttributeBindings(parsedAttributes, renderOptions)
  }>${content}</${renderedType}>`;
}

export { renderElement };
