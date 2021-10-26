/// <reference lib="dom" />
import produce from "immer";
import { v4 as uuid } from "uuid";
import { draggable } from "../src/draggable.ts";
import { renderComponent } from "../src/renderComponent.ts";
import { traversePage } from "../src/traversePage.ts";
import type { Component, Components, DataContext, Page } from "../types.ts";

console.log("Hello from the page editor");

const documentTreeElementId = "document-tree-element";
const controlsElementId = "controls-element";

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
  const [components, context, pageDefinition]: [Components, DataContext, Page] =
    await Promise.all([
      fetch("/components.json").then((res) => res.json()),
      fetch("/context.json").then((res) => res.json()),
      fetch("/definition.json").then((res) => res.json()),
    ]);

  const selectionContainer = document.createElement("div");
  selectionContainer.setAttribute(
    "x-state",
    "{ component: undefined }",
  );
  selectionContainer.setAttribute("x-label", "selected");

  createPageEditor(selectionContainer, components, context, pageDefinition);
  createComponentEditor(selectionContainer, components, context);

  parent.appendChild(selectionContainer);
}

function deleteEditor() {
  console.log("Deleting editor");

  document.getElementById(documentTreeElementId)?.remove();
  document.getElementById(controlsElementId)?.remove();
}

async function createPageEditor(
  parent: HTMLElement,
  components: Components,
  context: DataContext,
  pageDefinition: Page,
) {
  console.log("Creating page editor");

  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await renderComponent(
    components.pageEditor,
    components,
    context,
  );
  treeElement.setAttribute("x-label", "parent");
  parent.appendChild(treeElement);

  // @ts-ignore Improve type
  setState({
    ...pageDefinition,
    page: initializePage(pageDefinition.page),
  }, {
    element: treeElement,
    parent: "editor",
  });

  // @ts-ignore This is from sidewind
  window.evaluateAllDirectives();

  const aside = treeElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;
  draggable({ element: aside, handle });
}

function initializePage(page: Page["page"]) {
  return produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p) => {
      p._id = uuid();
    });
  });
}

async function createComponentEditor(
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
  draggable({ element: aside, handle, xPosition: "right" });

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

function metaChanged(
  element: HTMLElement,
  value: string,
  setState: setState<[string, string]>,
) {
  // @ts-ignore This comes from sidewind
  const { editor: { meta } } = getState(element);
  const field = element.dataset.field as string;

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

  // @ts-ignore Improve type
  setState({ meta: { ...meta, [field]: value } }, { parent: "editor" });
}

const hoveredElements = new Set<HTMLElement>();

function elementClicked(element: HTMLElement, pageItem: Component) {
  // @ts-ignore This comes from sidewind
  const { editor: { page } } = getState(element);

  console.log("clicked element", element, pageItem);

  for (const element of hoveredElements.values()) {
    element.classList.remove("border");
    element.classList.remove("border-red-800");

    hoveredElements.delete(element);
  }

  const nextPage = produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === pageItem._id) {
        const element = findElement(
          document.querySelector("main"),
          i,
          page,
        ) as HTMLElement;

        if (element) {
          element.classList.add("border");
          element.classList.add("border-red-800");

          hoveredElements.add(element);
        }

        p._selected = true;
      } else {
        p._selected = false;
      }
    });
  });

  // TODO: If a value of x-each changes, trigger evaluation on it

  // @ts-ignore Improve type
  // setState({ component: pageItem }, { parent: "selected" });

  // @ts-ignore Improve type
  setState({ page: nextPage }, { parent: "editor" });
}

function elementChanged(
  element: HTMLElement,
  value: string,
  setState: setState<unknown>,
) {
  // @ts-ignore This comes from sidewind
  const { editor: { page }, selected: { component } } = getState(element);

  const nextPage = produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === component._id) {
        const element = findElement(
          document.querySelector("main"),
          i,
          page,
        ) as HTMLElement;

        if (element) {
          // TODO: Update element type
          // https://stackoverflow.com/a/59147202/228885
        }

        p.element = value;

        // @ts-ignore Improve type
        setState({ component: p }, { parent: "selected" });
      }
    });
  });

  // @ts-ignore Improve type
  setState({ page: nextPage }, { parent: "editor" });
}

function contentChanged(
  element: HTMLElement,
  value: string,
  setState: setState<unknown>,
) {
  // @ts-ignore This comes from sidewind
  const { editor: { page }, selected: { component } } = getState(element);

  const nextPage = produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === component._id) {
        const element = findElement(
          document.querySelector("main"),
          i,
          page,
        ) as HTMLElement;

        if (element) {
          element.innerHTML = value;
        }

        p.children = value;

        // @ts-ignore Improve type
        setState({ component: p }, { parent: "selected" });
      }
    });
  });

  // @ts-ignore Improve type
  setState({ page: nextPage }, { parent: "editor" });
}

function classChanged(
  element: HTMLElement,
  value: string,
  setState: setState<unknown>,
) {
  // @ts-ignore This comes from sidewind
  const { editor: { page }, selected: { component } } = getState(element);

  const nextPage = produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === component._id) {
        const element = findElement(
          document.querySelector("main"),
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

        // TODO: Find a better way to deal with selections -
        // maybe track just id and resolve later?
        // @ts-ignore Improve type
        // setState({ component: p }, { parent: "selected" });
      }
    });
  });

  // @ts-ignore Improve type
  setState({ page: nextPage }, { parent: "editor" });
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
