import type { Element } from "../types.ts";

function traverseComponents(
  components: Element,
  operation: (c: Element, index: number) => void,
) {
  let i = 0;

  function recurse(
    element: Element,
    operation: (c: Element, index: number) => void,
  ) {
    if (Array.isArray(element)) {
      element.forEach((p) => recurse(p, operation));
    } else {
      operation(element, i);
      i++;

      // TODO: Restore if needed
      /*
      if (Array.isArray(element.children)) {
        recurse(element.children, operation);
      }

      if (element.props) {
        // @ts-ignore TODO: Figure out a better type for this
        recurse(Object.values(element.props), operation);
      }
      */
    }
  }

  recurse(components, operation);
}

export { traverseComponents };
