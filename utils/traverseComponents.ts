import type { Layout } from "../types.ts";
import type { Component } from "../breeze/types.ts";

function traverseComponents(
  components: Layout,
  operation: (c: Component, index: number) => void,
) {
  let i = 0;

  function recurse(
    components: Component | Component[],
    operation: (c: Component, index: number) => void,
  ) {
    if (Array.isArray(components)) {
      components.forEach((p) => recurse(p, operation));
    } else {
      operation(components, i);
      i++;

      if (Array.isArray(components.children)) {
        recurse(components.children, operation);
      }

      if (components.props) {
        // @ts-ignore TODO: Figure out a better type for this
        recurse(Object.values(components.props), operation);
      }
    }
  }

  recurse(components, operation);
}

export { traverseComponents };
