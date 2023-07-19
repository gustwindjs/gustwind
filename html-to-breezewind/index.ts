// Note that this comes with a startup penalty documented at https://deno.land/x/deno_dom@v0.1.38
import {
  DOMParser,
  type Element,
  type NamedNodeMap,
} from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import type { Component } from "../breezewind/types.ts";

type Attributes = Component["attributes"];

const parser = new DOMParser();

function htmlToBreezewind(html: string): Component {
  const rootId = "this_should_be_unique"; // Id should be unique to the document
  // TODO: Is there a way to avoid wrapping into a div? It looks like the parser
  // likes to construct a <html> wrapper for fragments that are missing it.
  const document = parser.parseFromString(
    `<div id=${rootId}>${html}</div>`,
    "text/html",
  );
  return parseElement(document?.querySelector(`#${rootId}`)?.children[0]);
}

function parseElement(element: Element | undefined): Component {
  if (element) {
    const attributes = namedNodeMapToObject(element.attributes);

    return addCustomFields({
      type: element.tagName.toLowerCase(),
      children: element.children.length
        ? Array.from(element.children).map(parseElement)
        : element.innerText,
      attributes: filterAttributes(attributes),
    }, attributes);
  }

  return {};
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

// https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap
function namedNodeMapToObject(m: NamedNodeMap) {
  const ret: Attributes = {};

  for (let i = 0; i < m.length; i++) {
    const attr = m.item(i);

    if (attr) {
      ret[attr.name] = attr.value;
    }
  }

  return ret;
}

export default htmlToBreezewind;
