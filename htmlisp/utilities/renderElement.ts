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

  if (!isFragment && !parsedChildren && typeof closesWith === "string") {
    return `<${type}${
      getAttributeBindings(parsedAttributes, renderOptions)
    }${closesWith}>`;
  }

  const content = renderTextValue(parsedChildren, renderOptions).concat(
    renderedChildren,
  );

  if (isFragment && (type === "fragment" || !parsedAttributes.type)) {
    return content;
  }

  const t = type === "noop" && parsedAttributes.type || type;

  if (t) {
    if (type === "noop") {
      delete parsedAttributes.type;
    }

    return `<${t}${
      getAttributeBindings(parsedAttributes, renderOptions)
    }>${content}</${t}>`;
  }

  return content;
}

export { renderElement };
