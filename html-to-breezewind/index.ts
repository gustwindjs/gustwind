// Note that this comes with a startup penalty documented at https://deno.land/x/deno_dom@v0.1.38
import {
  DOMParser,
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
  const rootElement = document?.querySelector(`#${rootId}`)?.children[0];

  console.log(rootElement?.children?.length);

  if (rootElement) {
    const attributes = namedNodeMapToObject(rootElement.attributes);

    return addClassList({
      type: rootElement.tagName.toLowerCase(),
      children: rootElement.innerText,
      attributes: filterAttributes(attributes),
    }, attributes);
  }

  return {};
}

function addClassList(c: Component, attributes: Attributes): Component {
  if (attributes?._classlist) {
    return {
      ...c,
      // TODO: Better do a type check?
      classList: stringToObject(attributes._classlist as string),
    };
  }

  return c;
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
      // Do not transform classlist as it is handled separately as an exception
      if (key !== "_classlist") {
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
