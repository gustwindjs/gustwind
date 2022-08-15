/// <reference lib="dom" />
import { getParents } from "../utils/getParents.ts";
import { changeTag } from "../utils/changeTag.ts";
import { traverseComponents } from "../utils/traverseComponents.ts";
import breezewind from "../breezewind/index.ts";
import * as breezeExtensions from "../breezewind/extensions.ts";
import { draggable, produce, tw } from "../client-deps.ts";
// import { getPagePath } from "../utils/getPagePath.ts";
import type { Components, DataContext, Route } from "../types.ts";
import type { Component as BreezeComponent } from "../breezewind/types.ts";

// TODO: Figure out how to deal with the now missing layout body
const documentTreeElementId = "document-tree-element";
const controlsElementId = "controls-element";

type StateName = "editor" | "selected";

// TODO: Consume these types from sidewind somehow (pragma?)
declare global {
  function getState<T>(element: HTMLElement): T;
  function setState<T>(
    state: T,
    { element, parent }: { element: HTMLElement; parent: StateName },
  ): void;
  function evaluateAllDirectives(): void;
}

type EditorState = {
  layout: BreezeComponent;
  meta: Route["meta"];
  selectionId?: string;
};
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

  const componentEditor = await createComponentEditor(components, context);
  editorContainer.append(componentEditor);

  // TODO: Re-enable the side effect to update FS
  // Likely this should send patches, not whole structures
  //const updateElement = document.createElement("div");
  //updateElement.setAttribute("x", "updateFileSystem(state)");
  //editorsElement.appendChild(updateElement);

  document.body.appendChild(editorContainer);

  evaluateAllDirectives();

  const elementSelected = getElementSelected(editorContainer);

  // https://stackoverflow.com/questions/9012537/how-to-get-the-element-clicked-for-the-whole-document
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
  globalThis.onclick = ({ target }) => elementSelected(target);

  // Support ios as well
  globalThis.ontouchstart = ({ target }) => elementSelected(target);
}

function getElementSelected(editorContainer: HTMLElement) {
  return function elementSelected(target: EventTarget | null) {
    if (!target) {
      return;
    }

    // TODO: How to know this is HTMLElement during runtime?
    const t = target as HTMLElement;
    const closestElement = t.hasAttribute("data-id")
      ? t
      : getParents(t, "data-id")[0];

    // Likely the user clicked on something within an editor panel for example
    if (!closestElement) {
      return;
    }

    const selectionId = closestElement.getAttribute("data-id");
    const { editor: { layout } } = getState<PageState>(editorContainer);

    setState({ selectionId }, { element: editorContainer, parent: "editor" });
    closestElement &&
      validElementSelected(editorContainer, closestElement, layout);
  };
}

// This is likely a bad coupling. It would be better to maintain a separate DOM
// element for outlines.
let editedElement: Element;

function validElementSelected(
  editorContainer: HTMLElement,
  target: HTMLElement,
  layout: BreezeComponent,
) {
  let previousContent: string;
  const selectionId = target.dataset.id;

  if (!selectionId) {
    console.log("target doesn't have a selection id");

    return;
  }

  const onInputListener = (e: Event) => {
    if (!e || !e.target) {
      return;
    }

    updateElementContent(
      editorContainer,
      layout,
      selectionId,
      e.target as HTMLElement,
      previousContent,
    );
  };

  const focusOutListener = (e: Event) => {
    const inputElement = (e.target as HTMLElement);

    if (!inputElement) {
      console.warn("inputListener - No element found");

      return;
    }

    e.preventDefault();

    target.removeAttribute("contenteditable");
    target.removeEventListener("input", onInputListener);
    target.removeEventListener("focusout", focusOutListener);
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
    target.addEventListener("input", onInputListener);

    // @ts-ignore TODO: Maybe target has to become HTMLElement?
    target.focus();
  }
}

function updateElementContent(
  editorContainer: HTMLElement,
  layout: EditorState["layout"],
  selectionId: EditorState["selectionId"],
  htmlElement: HTMLElement,
  previousContent: string,
) {
  const newContent = htmlElement.textContent;

  if (previousContent === newContent) {
    console.log("content didn't change");

    return;
  }

  if (typeof newContent !== "string") {
    return;
  }

  console.log("content changed", newContent);

  const nextLayout = produce(layout, (draftLayout: BreezeComponent) => {
    traverseComponents(draftLayout, (p) => {
      if (p?.attributes?.["data-id"] === selectionId) {
        p.children = newContent;
      }
    });
  });

  const element = editorContainer.children[0] as HTMLElement;

  setState({ layout: nextLayout }, {
    element,
    parent: "editor",
  });
}

const editorsId = "editors";

function createEditorContainer(layout: BreezeComponent, route: Route) {
  let editorsElement = document.getElementById(editorsId);
  const initialState: EditorState = {
    layout,
    meta: route.meta,
    selectionId: undefined,
  };

  editorsElement?.remove();

  editorsElement = document.createElement("div");
  editorsElement.id = editorsId;
  editorsElement.style.visibility = "visible";
  editorsElement.setAttribute(
    "x-state",
    JSON.stringify(initialState),
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

// TODO: Restore
/*
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
*/

async function createPageEditor(
  components: Components,
  context: DataContext,
) {
  console.log("creating page editor");

  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await breezewind({
    component: components.PageEditor,
    components,
    // @ts-ignore: TODO: Fix type
    context,
    extensions: [
      breezeExtensions.classShortcut(tw),
      breezeExtensions.foreach,
      breezeExtensions.visibleIf,
    ],
  });

  const aside = treeElement.children[0] as HTMLElement;
  const handle = aside.children[0] as HTMLElement;

  // @ts-ignore: TODO: Fix type
  draggable({ element: aside, handle });

  return treeElement;
}

async function createComponentEditor(
  components: Components,
  context: DataContext,
) {
  const controlsElement = document.createElement("div");
  controlsElement.id = controlsElementId;
  controlsElement.innerHTML = await breezewind({
    component: components.ComponentEditor,
    components,
    // @ts-ignore: TODO: Fix type
    context,
    extensions: [
      breezeExtensions.classShortcut(tw),
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

function contentChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { layout, selectionId } } = getState<PageState>(element);
  const nextLayout = produceNextLayout(layout, selectionId, (p, elements) => {
    elements.forEach((e) => {
      e.innerHTML = value;
    });

    p.children = value;
  });

  setState({ layout: nextLayout }, { element, parent: "editor" });
}

function classChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { layout, selectionId } } = getState<PageState>(element);

  const nextLayout = produceNextLayout(layout, selectionId, (p, elements) => {
    if (Array.isArray(p)) {
      return;
    }

    elements.forEach((e) => e.setAttribute("class", value));

    // @ts-ignore This is fine
    p.class = value;
  });

  setState({ layout: nextLayout }, {
    element,
    parent: "editor",
  });
}

function elementChanged(
  element: HTMLElement,
  value: string,
) {
  const { editor: { layout, selectionId } } = getState<PageState>(element);
  const nextLayout = produceNextLayout(layout, selectionId, (p, elements) => {
    if (Array.isArray(p)) {
      return;
    }

    elements.forEach((e) => e.replaceWith(changeTag(e, value)));

    p.type = value;
  });

  setState({ layout: nextLayout }, { element, parent: "editor" });
}

function produceNextLayout(
  layout: BreezeComponent,
  selectionId: EditorState["selectionId"],
  matched: (p: BreezeComponent, elements: HTMLElement[]) => void,
) {
  return produce(layout, (draftLayout: BreezeComponent) => {
    traverseComponents(draftLayout, (p) => {
      if (p?.attributes?.["data-id"] === selectionId) {
        matched(
          p,
          Array.from(document.querySelectorAll(`*[data-id="${selectionId}"]`)),
        );
      }
    });
  });
}

function getSelectedComponent(editor: EditorState) {
  const { layout, selectionId } = editor;

  if (!selectionId) {
    return {};
  }

  let ret;

  traverseComponents(layout, (p) => {
    if (p?.attributes?.["data-id"] === selectionId) {
      ret = p;
    }
  });

  return ret;
}

declare global {
  interface Window {
    createEditor: typeof createEditor;
    classChanged: typeof classChanged;
    contentChanged: typeof contentChanged;
    getSelectedComponent: typeof getSelectedComponent;
    metaChanged: typeof metaChanged;
    elementChanged: typeof elementChanged;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the page editor");

  window.createEditor = createEditor;
  window.classChanged = classChanged;
  window.contentChanged = contentChanged;
  window.getSelectedComponent = getSelectedComponent;
  window.metaChanged = metaChanged;
  window.elementChanged = elementChanged;
}

export { createEditor, toggleEditorVisibility };
