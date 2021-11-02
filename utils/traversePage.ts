import type { Component, Page } from "../types.ts";

function traversePage(
  page: Page["page"],
  operation: (c: Component, index: number) => void,
) {
  let i = 0;

  function recurse(
    page: Page["page"],
    operation: (c: Component, index: number) => void,
  ) {
    if (Array.isArray(page)) {
      page.forEach((p) => recurse(p, operation));
    } else {
      operation(page, i);
      i++;

      if (Array.isArray(page.children)) {
        recurse(page.children, operation);
      }
    }
  }

  recurse(page, operation);
}

export { traversePage };
