import { nanoid } from "../server-deps.ts";
import { isObject } from "./functional.ts";
import type { Component } from "../breezewind/types.ts";

// TODO: Maybe this should become completely generic (just arrays and objects)
// Doing this would likely fix the typing as a side effect
function attachIds<T extends Component | Component[]>(
  component: T,
): T {
  if (Array.isArray(component)) {
    // @ts-ignore TODO: Figure out how to type this correctly
    return component.map((c) => attachIds(c));
  }

  const ret = {
    ...component,
    attributes: {
      ...component.attributes,
      "data-id": nanoid(),
    },
  };

  if (Array.isArray(component.children)) {
    // @ts-ignore This will be array anyway
    ret.children = attachIds(component.children);
  }

  if (component.props) {
    // @ts-ignore TODO: Figure out how to type this correctly
    ret.props = Object.fromEntries(
      Object.entries(component.props).map((
        [k, v],
        // @ts-ignore TODO: Figure out how to type this correctly
      ) => [k, isObject(v) ? attachIds(v) : v]),
    );
  }

  return ret;
}

export { attachIds };
