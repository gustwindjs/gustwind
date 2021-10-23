/// <reference lib="dom" />
import { setup } from "twind-shim";
import { draggable } from "../src/draggable.ts";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import { renderComponent } from "../src/renderComponent.ts";
import type { Component, Components, DataContext, Page } from "../types.ts";

console.log("Hello from the page editor");

const documentTreeElementId = "document-tree-element";
const controlsElementId = "controls-element";

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

function recreateEditor() {
  deleteEditor();

  const editorsElement = document.getElementById("editors");

  if (editorsElement) {
    createEditor(editorsElement);
  } else {
    console.error("Failed to find editors element", editorsElement);
  }
}

async function createEditor(parent: HTMLElement) {
  const components: Components = await fetch("/components.json").then((res) =>
    res.json()
  );
  const context: DataContext = await fetch("./context.json").then((res) =>
    res.json()
  );

  fetch("./definition.json").then((res) => res.json()).then(
    (pageDefinition) => {
      // const selectionContainer = document.createElement("div");
      // selectionContainer.setAttribute("x-state", "{ selected: undefined }");
      // selectionContainer.setAttribute("x-label", "selectionContainer");

      // TODO: Set up an intermediate container here to capture selected state
      renderPageEditor(parent, components, context, pageDefinition);
      renderComponentEditor(parent, components, context);
    },
  );
}

function deleteEditor() {
  console.log("Deleting editor");

  document.getElementById(documentTreeElementId)?.remove();
  document.getElementById(controlsElementId)?.remove();
}

async function renderPageEditor(
  parent: HTMLElement,
  components: Components,
  context: DataContext,
  pageDefinition: Page,
) {
  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await renderComponent(
    components.pageEditor,
    components,
    context,
  );
  const meta = Object.entries(pageDefinition.meta).map(([field, value]) => ({
    field,
    value,
  }));
  const dataSources = pageDefinition.dataSources?.map((dataSource) => (
    Object.entries(dataSource).map(
      (
        [field, value],
      ) => ({
        field,
        value,
      }),
    )
  ));

  treeElement.setAttribute("x-label", "parent");
  parent.appendChild(treeElement);

  // @ts-ignore Improve type
  setState({ meta, dataSources, page: pageDefinition.page }, {
    element: treeElement,
    parent: "editorContainer",
  });

  // @ts-ignore This is from sidewind
  window.evaluateAllDirectives();

  const aside = treeElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;
  draggable({ element: aside, handle });
}

async function renderComponentEditor(
  parent: HTMLElement,
  components: Components,
  context: DataContext,
) {
  const controlsElement = document.createElement("div");
  controlsElement.id = controlsElementId;
  controlsElement.innerHTML = await renderComponent(
    components.componentEditor,
    components,
    context,
  );

  parent.appendChild(controlsElement);

  const aside = controlsElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;
  draggable({ element: aside, handle });

  // TODO: Gradient syntax
  // bg-gradient-to-br
  // from-purple-200
  // to-emerald-100

  // TODO: Padding
  // py-8
  // px-4
  // pr-4
  // sm:py-8

  // TODO: Margin
  // sm:mx-auto

  // TODO: Max width
  // max-w-3xl

  // TODO: Width
  // w-full

  // TODO: Flex
  // flex
  // flex-col
  // gap-8

  // TODO: Text size
  // text-4xl
  // text-xl
  // md:text-4xl
  // md:text-8xl

  // TODO: Wrapping
  // whitespace-nowrap

  // TODO: Font weight
  // font-extralight

  // TODO: Prose
  // prose
  // lg:prose-xl

  // TODO: Orientation
  // fixed

  // TODO: Position
  // top-16

  // TODO: Visibility
  // hidden
  // lg-inline
}

type setState<V> = (fn: (state: V) => V) => void;

function metaChanged(value: string, setState: setState<{ field: "title" }>) {
  setState(({ field }) => {
    if (field === "title") {
      const titleElement = document.querySelector("title");

      if (titleElement) {
        titleElement.innerHTML = value || "";
      } else {
        console.warn("The page doesn't have a <title>!");
      }
    } else {
      const metaElement = document.head.querySelector(
        "meta[name='" + field + "']",
      );

      if (metaElement) {
        metaElement.setAttribute("content", value);
      } else {
        console.warn(`The page doesn't have a ${field} meta element!`);
      }
    }

    return { field, value };
  });
}

const hoveredElements = new Set<HTMLElement>();

function elementClicked(
  pageItem: Component,
  setState: setState<{
    page: Page["page"];
  }>,
) {
  setState(({ page }) => {
    for (const element of hoveredElements.values()) {
      element.classList.remove("border");
      element.classList.remove("border-red-800");

      hoveredElements.delete(element);
    }

    traverse(page, (p, i) => {
      if (p === pageItem) {
        const element = findElement(
          document.getElementById("pagebody"),
          i,
          page,
        ) as HTMLElement;

        if (element) {
          element.classList.add("border");
          element.classList.add("border-red-800");

          hoveredElements.add(element);
        }
      }
    });

    return { selected: pageItem };
    // @ts-ignore Improve type
  }, { parent: "editorContainer" });
}

function elementChanged(
  value: string,
  setState: setState<
    {
      selected: Component;
      page: Page["page"];
    }
  >,
) {
  setState(
    // @ts-ignore How to type this?
    ({ selected, page }) => {
      let newSelected;

      traverse(page, (p, i) => {
        if (p === selected) {
          const element = findElement(
            document.getElementById("pagebody"),
            i,
            page,
          ) as HTMLElement;

          if (element) {
            // TODO: Update element type
            // https://stackoverflow.com/a/59147202/228885
          }

          p.element = value;

          newSelected = p;
        }
      });

      return {
        selected: newSelected,
        page,
      };
    },
  );
}

function contentChanged(
  value: string,
  setState: setState<
    {
      selected: Component;
      page: Page["page"];
    }
  >,
) {
  setState(
    // @ts-ignore How to type this?
    ({ selected, page }) => {
      let newSelected;

      traverse(page, (p, i) => {
        if (p === selected) {
          const element = findElement(
            document.getElementById("pagebody"),
            i,
            page,
          ) as HTMLElement;

          if (element) {
            element.innerHTML = value;
          }

          p.children = value;

          newSelected = p;
        }
      });

      return {
        selected: newSelected,
        page,
      };
    },
  );
}

function classChanged(
  value: string,
  setState: setState<
    {
      selected: Component;
      page: Page["page"];
    }
  >,
) {
  setState(
    // @ts-ignore How to type this?
    ({ selected, page }) => {
      let newSelected;

      traverse(page, (p, i) => {
        if (p === selected) {
          const element = findElement(
            document.getElementById("pagebody"),
            i,
            page,
          ) as HTMLElement;

          if (element) {
            element.setAttribute("class", value);

            // TODO: Is there a nicer way to retain selection?
            element.classList.add("border");
            element.classList.add("border-red-800");
          }

          p.class = value;

          newSelected = p;
        }
      });

      return {
        selected: newSelected,
        page,
      };
    },
  );
}

function findElement(
  element: Element | null,
  index: number,
  page: Page["page"],
): Element | null {
  let i = 0;

  function recurse(
    element: Element | null | undefined,
    page: Page["page"],
  ): Element | null {
    if (!element) {
      return null;
    }

    if (Array.isArray(page)) {
      let elem: Element | null | undefined = element;

      for (const p of page) {
        const match = recurse(elem, p);

        if (match) {
          return match;
        }

        elem = elem?.nextElementSibling;
      }
    } else {
      if (index === i) {
        return element;
      }

      i++;

      if (Array.isArray(page.children)) {
        const match = recurse(element.firstElementChild, page.children);

        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  return recurse(element?.firstElementChild, page);
}

function traverse(
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

// TODO: Figure out what the error means
declare global {
  interface Window {
    createEditor: typeof createEditor;
    recreateEditor: typeof recreateEditor;
    metaChanged: typeof metaChanged;
    classChanged: typeof classChanged;
    elementClicked: typeof elementClicked;
    elementChanged: typeof elementChanged;
    contentChanged: typeof contentChanged;
  }
}

window.createEditor = createEditor;
window.recreateEditor = recreateEditor;
window.metaChanged = metaChanged;
window.classChanged = classChanged;
window.elementClicked = elementClicked;
window.elementChanged = elementChanged;
window.contentChanged = contentChanged;
