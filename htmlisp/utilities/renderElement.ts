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

  if (shouldRenderFragmentContent(isFragment, type, parsedAttributes)) {
    return content;
  }

  const renderedType = getRenderedType(type, parsedAttributes);

  if (!renderedType) {
    return content;
  }

  return renderNormalElement(
    renderedType,
    type,
    parsedAttributes,
    content,
    renderOptions,
  );
}

function shouldRenderFragmentContent(
  isFragment: boolean,
  type: string,
  parsedAttributes: Record<string, unknown>,
) {
  return isFragment && (type === "fragment" || !parsedAttributes.type);
}

function getRenderedType(
  type: string,
  parsedAttributes: Record<string, unknown>,
) {
  const renderedType = type === "noop" && parsedAttributes.type || type;

  return renderedType ? String(renderedType) : "";
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
