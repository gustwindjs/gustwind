/// <reference lib="dom" />
import produce from "immer";
import { v4 as uuid } from "uuid";
import { draggable } from "../src/draggable.ts";
import { renderComponent } from "../src/renderComponent.ts";
import { traversePage } from "../src/traversePage.ts";
import { importScript } from "../src/importScript.ts";
import type { Component, Components, DataContext, Page } from "../types.ts";

console.log("Hello from the page editor");

const documentTreeElementId = "document-tree-element";
const controlsElementId = "controls-element";

type StateName = "editor" | "selected";

// TODO: Push these types to sidewind
declare global {
  function getState<T>(element: HTMLElement): T;
  function setState<T>(
    state: T,
    { element, parent }: { element: HTMLElement; parent: StateName },
  ): void;
  function evaluateAllDirectives(): void;
}

type EditorState = Page;
type SelectedState = { componentId?: string };
type PageState = {
  editor: EditorState;
  selected: SelectedState;
};

async function createEditor() {
  console.log("create editor");

  const [components, context, pageDefinition]: [Components, DataContext, Page] =
    await Promise.all([
      fetch("/components.json").then((res) => res.json()),
      fetch("/context.json").then((res) => res.json()),
      fetch("/definition.json").then((res) => res.json()),
    ]);

  const editorContainer = createEditorContainer(pageDefinition);

  const selectionContainer = document.createElement("div");
  selectionContainer.setAttribute("x-label", "selected");
  selectionContainer.setAttribute("x-state", "{ componentId: undefined }");
  editorContainer.appendChild(selectionContainer);

  const pageEditor = await createPageEditor(
    components,
    context,
  );
  selectionContainer.append(pageEditor);

  const componentEditor = await createComponentEditor(components, context);
  selectionContainer.append(componentEditor);

  // TODO: Re-enable the side effect to update FS
  //const updateElement = document.createElement("div");
  //updateElement.setAttribute("x", "updateFileSystem(state)");
  //editorsElement.appendChild(updateElement);

  document.body.appendChild(editorContainer);

  evaluateAllDirectives();
}

const editorsId = "editors";

function createEditorContainer(pageDefinition: Page) {
  let editorsElement = document.getElementById(editorsId);

  editorsElement?.remove();

  editorsElement = document.createElement("div");
  editorsElement.id = editorsId;
  editorsElement.style.visibility = "visible";
  editorsElement.setAttribute(
    "x-state",
    JSON.stringify({
      ...pageDefinition,
      page: initializePage(pageDefinition.page),
    }),
  );
  editorsElement.setAttribute("x-label", "editor");

  return editorsElement;
}

function initializePage(page: Page["page"]) {
  return produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p) => {
      p._id = uuid();
    });
  });
}

// TODO: Push the web socket bits to a separate module that's handled separately
// TODO: Eliminate global
let socket: WebSocket;

async function createWebSocketConnection() {
  if (location.hostname === "localhost") {
    console.log("Loading web socket client");

    await importScript("./webSocketClient.js");

    // @ts-ignore Fix the type
    socket = window.createWebSocket(getPagePath());
  }
}

function updateFileSystem(state: Page) {
  const nextPage = produce(state.page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p) => {
      // TODO: Generalize to erase anything that begins with a single _
      delete p._id;

      if (p.class === "") {
        delete p.class;
      }
    });
  });

  const payload = {
    path: getPagePath(),
    data: { ...state, page: nextPage },
  };

  // TODO: Don't send if payload didn't change
  socket.send(JSON.stringify({ type: "update", payload }));
}

function getPagePath() {
  const pathElement = document.querySelector('meta[name="pagepath"]');

  if (!pathElement) {
    console.error("path element was not found!");

    return;
  }

  const pagePath = pathElement.getAttribute("content");

  if (!pagePath) {
    console.log("pagePath was not found in path element");

    return;
  }

  return pagePath;
}

async function createPageEditor(
  components: Components,
  context: DataContext,
) {
  console.log("Creating page editor");

  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await renderComponent(
    components.PageEditor,
    components,
    context,
  );

  const aside = treeElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;
  draggable({ element: aside, handle });

  return treeElement;
}

async function createComponentEditor(
  components: Components,
  context: DataContext,
) {
  const controlsElement = document.createElement("div");
  controlsElement.id = controlsElementId;
  controlsElement.innerHTML = await renderComponent(
    components.ComponentEditor,
    components,
    context,
  );

  const aside = controlsElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;
  draggable({ element: aside, handle, xPosition: "right" });

  return controlsElement;

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

function metaChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { meta } } = getState<PageState>(element);
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

  setState({ meta: { ...meta, [field]: value } }, {
    element,
    parent: "editor",
  });
}

const hoveredElements = new Set<HTMLElement>();

function elementClicked(element: HTMLElement, componentId: Component["_id"]) {
  // Stop bubbling as we're within a recursive HTML structure
  event?.stopPropagation();

  const { editor: { page } } = getState<PageState>(element);

  for (const element of hoveredElements.values()) {
    element.classList.remove("border");
    element.classList.remove("border-red-800");

    hoveredElements.delete(element);
  }

  traversePage(page, (p, i) => {
    if (p._id === componentId) {
      element.classList.add("border");
      element.classList.add("border-red-800");

      hoveredElements.add(element);
    }
  });

  setState({ componentId }, { element, parent: "selected" });
}

function elementChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { page }, selected: { componentId } } = getState<PageState>(
    element,
  );
  const nextPage = produceNextPage(page, componentId, (p, element) => {
    if (element) {
      // TODO: Update element type
      // https://stackoverflow.com/a/59147202/228885
    }

    p.element = value;
  });

  setState({ page: nextPage }, { element, parent: "editor" });
}

function contentChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { page }, selected: { componentId } } = getState<PageState>(
    element,
  );
  const nextPage = produceNextPage(page, componentId, (p, element) => {
    if (element) {
      element.innerHTML = value;
    }

    p.children = value;
  });

  setState({ page: nextPage }, { element, parent: "editor" });
}

function classChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { page }, selected: { componentId } } = getState<PageState>(
    element,
  );

  const nextPage = produceNextPage(page, componentId, (p, element) => {
    if (element) {
      element.setAttribute("class", value);

      // TODO: Is there a nicer way to retain selection?
      element.classList.add("border");
      element.classList.add("border-red-800");
    }

    p.class = value;
  });

  setState({ page: nextPage }, { element, parent: "editor" });
}

function produceNextPage(
  page: Page["page"],
  componentId: Component["_id"],
  matched: (p: Component, element: HTMLElement) => void,
) {
  return produce(page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === componentId) {
        matched(
          p,
          findElement(
            document.querySelector("main"),
            i,
            page,
          ) as HTMLElement,
        );
      }
    });
  });
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

function getSelectedComponent(
  editorState: EditorState,
  selectedState: SelectedState,
) {
  let match = {};
  const { componentId } = selectedState;

  traversePage(editorState.page, (p) => {
    if (p._id === componentId) {
      match = p;
    }
  });

  return match;
}

declare global {
  interface Window {
    createEditor: typeof createEditor;
    createWebSocketConnection: typeof createWebSocketConnection;
    metaChanged: typeof metaChanged;
    classChanged: typeof classChanged;
    elementClicked: typeof elementClicked;
    elementChanged: typeof elementChanged;
    contentChanged: typeof contentChanged;
    getSelectedComponent: typeof getSelectedComponent;
    updateFileSystem: typeof updateFileSystem;
  }
}

window.createEditor = createEditor;
window.createWebSocketConnection = createWebSocketConnection;
window.metaChanged = metaChanged;
window.classChanged = classChanged;
window.elementClicked = elementClicked;
window.elementChanged = elementChanged;
window.contentChanged = debounce<typeof contentChanged>(contentChanged);
window.getSelectedComponent = getSelectedComponent;
window.updateFileSystem = updateFileSystem;

// https://www.freecodecamp.org/news/javascript-debounce-example/
function debounce<F>(func: F, timeout = 100) {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // @ts-ignore How to type this
      func.apply(this, args);
    }, timeout);
  };
}
