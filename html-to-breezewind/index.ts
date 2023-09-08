import htm from "https://esm.sh/htm@3.1.1";
import type { Component } from "../breezewind/types.ts";

type Attributes = Component["attributes"];

const html = htm.bind(h);

function htmlToBreezewind(htmlInput: string): Component {
  // @ts-ignore Ignore for now
  return html([htmlInput]);
}

function h(
  type: string,
  attributes: Attributes, // Record<string, unknown> | null,
  ...children: Component[]
) {
  return addCustomFields({
    type,
    children: children.length === 1 && typeof children[0] === "string"
      ? children[0]
      : Array.isArray(children)
      ? children
      : [children],
    attributes: filterAttributes(attributes === null ? {} : attributes),
  }, attributes);
}

function addCustomFields(c: Component, attributes: Attributes): Component {
  let ret: Component = c;

  if (attributes?._classlist) {
    ret = {
      ...ret,
      // TODO: Better do a type check?
      classList: stringToObject(attributes._classlist as string),
    };
  }

  if (attributes?._children) {
    // TODO: Better do a type check?
    ret = { ...ret, children: stringToObject(attributes._children as string) };
  }

  return ret;
}

function filterAttributes(attributes: Attributes): Attributes {
  // Avoid mutating the original structure (no side effects)
  const ret: Attributes = structuredClone(attributes);

  if (!ret) {
    return {};
  }

  // Drop anything starting with a _
  Object.keys(ret).forEach((key: string) => {
    if (key.startsWith("_")) {
      // Do not transform separately handled cases
      if (!["_children", "_classlist"].includes(key)) {
        ret[key.split("").slice(1).join("")] = stringToObject(
          // TODO: Better do a type check?
          ret[key] as string,
        );
      }

      delete ret[key];
    }
  });

  return ret;
}

function stringToObject(s: string) {
  return JSON.parse(s.replaceAll(`'`, '"'));
}

export default htmlToBreezewind;
