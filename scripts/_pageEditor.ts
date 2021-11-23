/// <reference lib="dom" />
import { produce } from "https://cdn.skypack.dev/immer@9.0.6?min";
import { nanoid } from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import { draggable } from "../utils/draggable.ts";
import { renderComponent } from "../src/renderComponent.ts";
import { getPagePath } from "../utils/getPagePath.ts";
import type {
  Component,
  Components,
  DataContext,
  Layout,
  Route,
} from "../types.ts";

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

type EditorState = Layout & { meta: Route["meta"] };
type SelectedState = { componentId?: string };
type PageState = {
  editor: EditorState;
  selected: SelectedState;
};

async function createEditor() {
  console.log("create editor");

  const [components, context, layout, route]: [
    Components,
    DataContext,
    Layout,
    Route,
  ] = await Promise.all([
    fetch("/components.json").then((res) => res.json()),
    fetch("./context.json").then((res) => res.json()),
    fetch("./layout.json").then((res) => res.json()),
    fetch("./route.json").then((res) => res.json()),
  ]);

  const editorContainer = createEditorContainer(layout, route);

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
  // Likely this should send patches, not whole structures
  //const updateElement = document.createElement("div");
  //updateElement.setAttribute("x", "updateFileSystem(state)");
  //editorsElement.appendChild(updateElement);

  document.body.appendChild(editorContainer);

  evaluateAllDirectives();
}

const editorsId = "editors";

function createEditorContainer(layout: Layout, route: Route) {
  let editorsElement = document.getElementById(editorsId);

  editorsElement?.remove();

  editorsElement = document.createElement("div");
  editorsElement.id = editorsId;
  editorsElement.style.visibility = "visible";
  editorsElement.setAttribute(
    "x-state",
    JSON.stringify({
      ...layout,
      body: initializeBody(layout.body),
      meta: route.meta,
    }),
  );
  editorsElement.setAttribute("x-label", "editor");

  return editorsElement;
}

function toggleEditorVisibility() {
  const editorsElement = document.getElementById(editorsId);

  if (!editorsElement) {
    return;
  }

  editorsElement.style.visibility =
    editorsElement.style.visibility === "visible" ? "hidden" : "visible";
}

function initializeBody(body: Layout["body"]) {
  if (!body) {
    console.error("initializeBody - missing body");

    return;
  }

  return produce(body, (draftBody: Layout["body"]) => {
    traverseComponents(draftBody, (p) => {
      p._id = nanoid();
    });
  });
}

function updateFileSystem(state: Layout) {
  const nextBody = produce(state.body, (draftBody: Layout["body"]) => {
    traverseComponents(draftBody, (p) => {
      // TODO: Generalize to erase anything that begins with a single _
      delete p._id;

      if (p.class === "") {
        delete p.class;
      }
    });
  });

  const payload = {
    path: getPagePath(),
    data: { ...state, body: nextBody },
  };

  // TODO: Don't send if payload didn't change
  // @ts-ignore Figure out where to declare the global
  window.developmentSocket.send(JSON.stringify({ type: "update", payload }));
}

async function createPageEditor(
  components: Components,
  context: DataContext,
) {
  console.log("creating page editor");

  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await renderComponent(
    "",
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
    "",
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

  if (!field) {
    console.error(`${field} was not found in ${element.dataset}`);

    return;
  }

  if (field === "title") {
    const titleElement = document.querySelector("title");

    if (titleElement) {
      titleElement.innerHTML = value || "";
    } else {
      console.warn("The page doesn't have a <title>!");
    }
  } else {
    // TODO: Generalize this to work with other bindings as well. If any of
    // of the meta fields change, likely this should trigger renderComponent
    // using updated context and the head definition
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

  const { editor: { body } } = getState<PageState>(element);

  const focusOutListener = (e: Event) => {
    const inputElement = (e.target as HTMLElement);

    if (!inputElement) {
      console.warn("inputListener - No element found");

      return;
    }

    e.preventDefault();

    contentChanged(element, inputElement.textContent as string);
  };

  for (const element of hoveredElements.values()) {
    element.classList.remove("border");
    element.classList.remove("border-red-800");
    element.removeAttribute("contenteditable");
    element.removeEventListener("focusout", focusOutListener);

    hoveredElements.delete(element);
  }

  traverseComponents(body, (p, i) => {
    if (p._id === componentId) {
      const matchedElement = findElement(
        document.body,
        i,
        body,
      ) as HTMLElement;

      matchedElement.classList.add("border");
      matchedElement.classList.add("border-red-800");
      matchedElement.setAttribute("contenteditable", "true");
      matchedElement.addEventListener("focusout", focusOutListener);

      hoveredElements.add(matchedElement);
    }
  });

  setState({ componentId }, { element, parent: "selected" });
}

function elementChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { body }, selected: { componentId } } = getState<PageState>(
    element,
  );
  const nextBody = produceNextBody(body, componentId, (p, element) => {
    element?.replaceWith(changeTag(element, value));

    p.element = value;
  });

  setState({ body: nextBody }, { element, parent: "editor" });
}

// https://stackoverflow.com/questions/2206892/jquery-convert-dom-element-to-different-type/59147202#59147202
function changeTag(element: HTMLElement, tag: string) {
  // prepare the elements
  const newElem = document.createElement(tag);
  const clone = element.cloneNode(true);

  // move the children from the clone to the new element
  while (clone.firstChild) {
    newElem.appendChild(clone.firstChild);
  }

  // copy the attributes
  // @ts-ignore Fine like this
  for (const attr of clone.attributes) {
    newElem.setAttribute(attr.name, attr.value);
  }
  return newElem;
}

function contentChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { body }, selected: { componentId } } = getState<PageState>(
    element,
  );
  const nextBody = produceNextBody(body, componentId, (p, element) => {
    if (element) {
      element.innerHTML = value;
    }

    p.children = value;
  });

  setState({ body: nextBody }, { element, parent: "editor" });
}

function classChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { body }, selected: { componentId } } = getState<PageState>(
    element,
  );

  const nextBody = produceNextBody(body, componentId, (p, element) => {
    if (element) {
      element.setAttribute("class", value);

      // TODO: Is there a nicer way to retain selection?
      element.classList.add("border");
      element.classList.add("border-red-800");
    }

    p.class = value;
  });

  setState({ body: nextBody }, { element, parent: "editor" });
}

function produceNextBody(
  body: Layout["body"],
  componentId: Component["_id"],
  matched: (p: Component, element: HTMLElement) => void,
) {
  return produce(body, (draftBody: Layout["body"]) => {
    traverseComponents(draftBody, (p, i) => {
      if (p._id === componentId) {
        matched(
          p,
          findElement(
            document.body,
            i,
            body,
          ) as HTMLElement,
        );
      }
    });
  });
}

function findElement(
  element: Element | null,
  index: number,
  body: Layout["body"],
): Element | null {
  let i = 0;

  function recurse(
    element: Element | null | undefined,
    body: Layout["body"] | Component,
  ): Element | null {
    if (!element) {
      return null;
    }

    if (Array.isArray(body)) {
      let elem: Element | null | undefined = element;

      for (const p of body) {
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

      if (Array.isArray(body.children)) {
        const match = recurse(element.firstElementChild, body.children);

        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  return recurse(element?.firstElementChild, body);
}

function getSelectedComponent(
  editorState: EditorState,
  selectedState: SelectedState,
) {
  let match = {};
  const { componentId } = selectedState;

  traverseComponents(editorState.body, (p) => {
    if (p._id === componentId) {
      match = p;
    }
  });

  return match;
}

function traverseComponents(
  components: Component[],
  operation: (c: Component, index: number) => void,
) {
  let i = 0;

  function recurse(
    components: Component[] | Component,
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
    }
  }

  recurse(components, operation);
}

declare global {
  interface Window {
    createEditor: typeof createEditor;
    metaChanged: typeof metaChanged;
    classChanged: typeof classChanged;
    elementClicked: typeof elementClicked;
    elementChanged: typeof elementChanged;
    contentChanged: typeof contentChanged;
    getSelectedComponent: typeof getSelectedComponent;
    updateFileSystem: typeof updateFileSystem;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the page editor");

  window.createEditor = createEditor;
  window.metaChanged = metaChanged;
  window.classChanged = debounce<typeof classChanged>(classChanged);
  window.elementClicked = elementClicked;
  window.elementChanged = elementChanged;
  window.contentChanged = debounce<typeof contentChanged>(contentChanged);
  window.getSelectedComponent = getSelectedComponent;
  window.updateFileSystem = updateFileSystem;
}

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

export { createEditor, toggleEditorVisibility };
