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

  const selfClosingElement = getSelfClosingElement(
    isFragment,
    parsedChildren,
    closesWith,
  );

  if (typeof selfClosingElement !== "undefined") {
    return renderSelfClosingElement(
      type,
      parsedAttributes,
      selfClosingElement,
      renderOptions,
    );
  }

  const content = renderTextValue(parsedChildren, renderOptions).concat(
    renderedChildren,
  );

  return renderOpenElement(type, isFragment, parsedAttributes, content, renderOptions);
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

function getSelfClosingElement(
  isFragment: boolean,
  parsedChildren: unknown,
  closesWith: Element["closesWith"],
) {
  return !isFragment && !parsedChildren && typeof closesWith === "string"
    ? closesWith
    : undefined;
}

function renderOpenElement(
  type: string,
  isFragment: boolean,
  parsedAttributes: Record<string, unknown>,
  content: string,
  renderOptions?: HtmlispRenderOptions,
) {
  if (shouldRenderFragmentContent(isFragment, type, parsedAttributes)) {
    return content;
  }

  const renderedType = getRenderedType(type, parsedAttributes);

  return renderedType
    ? renderNormalElement(
      renderedType,
      type,
      parsedAttributes,
      content,
      renderOptions,
    )
    : content;
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
