import htm from "https://esm.sh/htm@3.1.1";
import type { Component } from "../breezewind/types.ts";

type Attributes = Component["attributes"];

const html = htm.bind(h);

function htmToBreezewind(htmlInput: string): Component | Component[] {
  // @ts-ignore Ignore for now
  return html([htmlInput]);
}

function h(
  type: string,
  attributes: Attributes, // Record<string, unknown> | null,
  ...children: Component[]
) {
  const childrenToReturn =
    children.length === 1 && typeof children[0] === "string"
      ? children[0]
      : Array.isArray(children)
      ? children
      : [children];

  if (type === "Noop") {
    return childrenToReturn;
  }

  return addCustomFields({
    type,
    children: childrenToReturn,
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
    // Skip comments
    if (key.startsWith("__")) {
      delete ret[key];
    } else if (key.startsWith("_")) {
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
  try {
    return JSON.parse(s.replaceAll(`'`, '"'));
  } catch (error) {
    console.error(`stringToObject - Failed to parse ${s}`);
    console.error(error);
  }
}

export { htmToBreezewind, stringToObject };
