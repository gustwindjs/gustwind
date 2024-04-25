import { getAttributeBindings } from "./getAttributeBindings.ts";
import { isString } from "../../utilities/functional.ts";
import type { Element } from "../types.ts";

function renderElement(
  parsedAttributes: Record<string, unknown> & { children?: string },
  tag: Element,
  renderedChildren: string,
) {
  const parsedChildren = parsedAttributes.children || "";
  const { type, closesWith } = tag;

  if (type !== "noop" && !parsedChildren && typeof closesWith === "string") {
    return `<${type}${getAttributeBindings(parsedAttributes)}${closesWith}>`;
  }

  // TODO: Should there be a more strict check against parsed children?
  const content = isString(parsedChildren)
    ? parsedChildren.concat(renderedChildren)
    : renderedChildren;

  if (type === "noop" && !parsedAttributes.type) {
    return content;
  }

  const t = type === "noop" && parsedAttributes.type || type;

  if (t) {
    if (type === "noop") {
      delete parsedAttributes.type;
    }

    return `<${t}${getAttributeBindings(parsedAttributes)}>${content}</${t}>`;
  }

  return content;
}

export { renderElement };
