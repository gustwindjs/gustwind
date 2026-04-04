import type { Element } from "../htmlisp/types.ts";

type ComponentTree = Element | ComponentTree[];

function traverseComponents(
  components: ComponentTree,
  operation: (c: Element, index: number) => void,
) {
  let i = 0;

  function recurse(
    element: ComponentTree,
    operation: (c: Element, index: number) => void,
  ) {
    if (Array.isArray(element)) {
      element.forEach((p) => recurse(p, operation));
    } else {
      operation(element, i);
      i++;

      recurse(
        element.children.filter((child): child is Element =>
          typeof child !== "string"
        ),
        operation,
      );
    }
  }

  recurse(components, operation);
}

export { traverseComponents };
