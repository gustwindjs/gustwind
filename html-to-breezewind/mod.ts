import htm from "https://esm.sh/htm@3.1.1";
import { isObject } from "../utilities/functional.ts";
import type { Component, Utility } from "../breezewind/types.ts";

type Attributes = Component["attributes"];

const html = htm.bind(h);

function htmlToBreezewind(htmlInput: string): Component | Component[] {
  // @ts-ignore Ignore for now
  return html([htmlInput]);
}

function h(
  type: string,
  attributes: Attributes, // Record<string, unknown> | null,
  ...children: Component[]
) {
  if (
    children.length > 0 &&
    children.every((children) => children.type === "slot")
  ) {
    return {
      type,
      props: convertChildrenToProps(children),
    };
  }

  const childrenToReturn =
    children.length === 1 && typeof children[0] === "string"
      ? children[0]
      : Array.isArray(children)
      ? children
      : [children];

  if (type === "noop") {
    return childrenToReturn;
  }

  const filteredAttributes = filterAttributes(
    attributes === null ? {} : attributes,
  );
  // Components have to map their values to props.
  // TODO: Maybe later on everything should be refactored to use attributes field.
  const isComponent = type.toUpperCase()[0] === type[0];
  const fieldName = isComponent ? "props" : "attributes";

  const ret = addCustomFields({
    type,
    children: childrenToReturn,
    [fieldName]: filteredAttributes,
  }, attributes);

  if (isComponent) {
    // Check possible local bindings
    const bindToProps = getLocalBindings(attributes);

    if (bindToProps) {
      ret.bindToProps = bindToProps;
    }
  }

  return ret;
}

function getLocalBindings(attributes: Attributes) {
  if (isObject(attributes)) {
    // @ts-expect-error Maybe this needs a better cast to an object
    const boundProps = Object.entries(attributes).filter(([k, v]) =>
      k.startsWith("#") && typeof v === "string"
    );

    if (!boundProps.length) {
      return;
    }

    return Object.fromEntries(
      boundProps.map(([k, v]) => [k.slice(1), stringToObject(v as string)]),
    );
  }
}

function convertChildrenToProps(children: Component[]) {
  const ret: [string | Utility, unknown][] = [];

  children.forEach((child) => {
    if (!child.attributes) {
      console.error("Slot child is missing attributes");
      console.error(child);

      return;
    }

    if (!child.attributes.name) {
      console.error("Slot child is missing name attribute");
      console.error(child);

      return;
    }

    ret.push([child.attributes.name, child.children]);
  });

  return Object.fromEntries(ret);
}

function addCustomFields(c: Component, attributes: Attributes): Component {
  let ret: Component = c;

  if (attributes?._classList) {
    ret = {
      ...ret,
      // TODO: Better do a type check?
      classList: stringToObject(attributes._classList as string),
    };
  }

  if (attributes?._children) {
    // TODO: Better do a type check?
    ret = { ...ret, children: stringToObject(attributes._children as string) };
  }

  if (attributes?._visibleIf) {
    ret = {
      ...ret,
      // TODO: Better do a type check?
      visibleIf: stringToObject(attributes._visibleIf as string),
    };
  }

  return ret;
}

function filterAttributes(attributes: Attributes): Attributes {
  // Avoid mutating the original structure (no side effects)
  const ret: Attributes = structuredClone(attributes);

  if (!ret) {
    return {};
  }

  // Drop anything starting with a _, __, or #
  Object.keys(ret).forEach((key: string) => {
    // Skip comments and local bindings
    if (key.startsWith("__") || key.startsWith("#")) {
      delete ret[key];
    } else if (key.startsWith("_")) {
      // Do not transform separately handled cases
      if (!["_children", "_classList", "_visibleIf"].includes(key)) {
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

export { htmlToBreezewind, stringToObject };
