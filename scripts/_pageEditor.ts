/// <reference lib="dom" />
import { produce } from "https://cdn.skypack.dev/immer@9.0.6?min";
import { draggable } from "../utils/draggable.ts";
import breeze from "../breeze/index.ts";
import * as breezeExtensions from "../breeze/extensions.ts";
import { getPagePath } from "../utils/getPagePath.ts";
import type {
  Component,
  Components,
  DataContext,
  Layout,
  Route,
} from "../types.ts";

// TODO: Figure out how to deal with the now missing layout body
const documentTreeElementId = "document-tree-element";
const controlsElementId = "controls-element";

type EditorComponent = Component & {
  _id?: string;
};

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

type EditorState = { layout: Layout; meta: Route["meta"]; selected: string };
type SelectedState = { componentId?: string };
type PageState = {
  editor: EditorState;
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

  const pageEditor = await createPageEditor(
    components,
    context,
  );
  editorContainer.append(pageEditor);

  // TODO: Re-enable the side effect to update FS
  // Likely this should send patches, not whole structures
  //const updateElement = document.createElement("div");
  //updateElement.setAttribute("x", "updateFileSystem(state)");
  //editorsElement.appendChild(updateElement);

  document.body.appendChild(editorContainer);

  evaluateAllDirectives();

  // https://stackoverflow.com/questions/9012537/how-to-get-the-element-clicked-for-the-whole-document
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
  globalThis.onclick = ({ target }) => {
    // TODO: How to know this is Element during runtime?
    const t = target as HTMLElement;
    const closestElement = t.hasAttribute("data-id")
      ? t
      : getParents(t, "data-id")[0];

    // Likely the user clicked on something within an editor panel for example
    if (!closestElement) {
      return;
    }

    setState({ selected: closestElement.getAttribute("data-id") }, {
      // @ts-ignore: TODO: Allow passing editorContainer here (sidewind needs a fix)
      element: editorContainer.children[0],
      parent: "editor",
    });
    closestElement && elementSelected(closestElement, editorContainer);
  };
}

// Adapted from Sidewind
function getParents(
  element: Element,
  attribute: string,
) {
  const ret = [];
  let parent = element.parentElement;

  while (true) {
    if (!parent) {
      break;
    }

    if (parent.hasAttribute(attribute)) {
      ret.push(parent);
    }

    parent = parent.parentElement;
  }

  return ret;
}

let editedElement: Element;

function elementSelected(target: HTMLElement, editorContainer: HTMLElement) {
  let previousContent: string;
  let selectionId = target.dataset.id;

  if (!selectionId) {
    console.log("target doesn't have a selection id");

    return;
  }

  // TODO: Compare textContent of target and fo
  const focusOutListener = (e: Event) => {
    const inputElement = (e.target as HTMLElement);

    if (!inputElement) {
      console.warn("inputListener - No element found");

      return;
    }

    e.preventDefault();

    target.removeAttribute("contenteditable");
    target.removeEventListener("focusout", focusOutListener);

    const newContent = inputElement.textContent;

    if (previousContent === newContent) {
      console.log("content didn't change");

      return;
    }

    console.log("content changed", inputElement.textContent);

    const { editor: { layout, selected } } = getState<PageState>(
      // @ts-ignore: TODO: Allow passing editorContainer here (sidewind needs a fix)
      editorContainer.children[0],
    );

    console.log("editor state", layout, selected);

    produce(layout, (draftLayout: Layout) => {
      traverseComponents(draftLayout, (p) => {
        /*if (draftLayout?.attributes?['data-id'] === selectionId) {
          match = p;
        }*/
      });
    });
  };

  if (editedElement) {
    editedElement.classList.remove("border");
    editedElement.classList.remove("border-red-800");
  }

  editedElement = target;

  target.classList.add("border");
  target.classList.add("border-red-800");

  // If element has children, enabling contenteditable on it will mess
  // up logic due to DOM change.
  if (target.children.length === 0 && target.textContent) {
    previousContent = target.textContent;

    target.setAttribute("contenteditable", "true");
    target.addEventListener("focusout", focusOutListener);

    // @ts-ignore TODO: Maybe target has to become HTMLElement?
    target.focus();
  }
}

function traverseComponents(
  components: Component,
  operation: (c: Component, index: number) => void,
) {
  let i = 0;

  function recurse(
    components: EditorComponent | EditorComponent[],
    operation: (c: EditorComponent, index: number) => void,
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
      layout,
      meta: route.meta,
      selected: undefined,
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

function updateFileSystem(state: Layout) {
  const nextBody = produce(state.body, (draftBody: Layout) => {
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
  treeElement.innerHTML = await breeze({
    component: components.PageEditor,
    components,
    // @ts-ignore: TODO: Fix type
    context,
    extensions: [
      breezeExtensions.classShortcut,
      breezeExtensions.foreach,
      breezeExtensions.visibleIf,
    ],
  });

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
  controlsElement.innerHTML = await breeze({
    component: components.ComponentEditor,
    components,
    // @ts-ignore: TODO: Fix type
    context,
    extensions: [
      breezeExtensions.classShortcut,
      breezeExtensions.foreach,
      breezeExtensions.visibleIf,
    ],
  });

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

function produceNextBody(
  body: Layout["body"],
  componentId: EditorComponent["_id"],
  matched: (p: EditorComponent, element: HTMLElement) => void,
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

declare global {
  interface Window {
    createEditor: typeof createEditor;
    metaChanged: typeof metaChanged;
    elementChanged: typeof elementChanged;
    updateFileSystem: typeof updateFileSystem;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the page editor");

  window.createEditor = createEditor;
  window.metaChanged = metaChanged;
  window.elementChanged = elementChanged;
  window.updateFileSystem = updateFileSystem;
}

export { createEditor, toggleEditorVisibility };
