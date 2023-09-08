import htm from "https://esm.sh/htm@3.1.1";
import type { Component } from "../breezewind/types.ts";

// type Attributes = Component["attributes"];

function h(
  type: string,
  attributes: Record<string, unknown> | null,
  ...children: Component[]
) {
  return {
    type,
    children: children.length === 1 && typeof children[0] === "string"
      ? children[0]
      : Array.isArray(children)
      ? children
      : [children],
    attributes: attributes === null ? {} : attributes,
  };
}

const html = htm.bind(h);

function htmlToBreezewind(htmlInput: string): Component {
  // @ts-ignore Ignore for now
  return html([htmlInput]);
}

export default htmlToBreezewind;
