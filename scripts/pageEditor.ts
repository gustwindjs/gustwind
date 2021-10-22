/// <reference lib="dom" />
import { setup } from "twind-shim";
import { draggable } from "../src/draggable.ts";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import { renderComponent } from "../src/renderComponent.ts";
import type {
  Component,
  Components,
  DataContext,
  Index,
  Page,
  PageItem,
} from "../types.ts";

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

type PageElements = (PageItem & Index)[];

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
  const dataSources = pageDefinition.dataSources?.map((dataSource) => ({
    state: Object.entries(dataSource).map(
      (
        [field, value],
      ) => ({
        field,
        value,
      }),
    ),
  }));
  const pageElements = addIndices<PageItem>(
    flattenPage(components, pageDefinition.page),
  );
  treeElement.setAttribute("x-label", "parent");
  parent.appendChild(treeElement);

  // @ts-ignore Improve type
  setState({ meta, dataSources, pageElements, page: pageDefinition.page }, {
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

function flattenPage(
  components: Components,
  component: Component | Component[],
  level = -1,
): PageItem[] {
  if (Array.isArray(component)) {
    return component.flatMap((c) => flattenPage(components, c, level + 1));
  }
  if (component.children) {
    if (typeof component.children === "string") {
      return [{
        ...component,
        isComponent: !!components[component.element],
        level,
      }];
    }

    return [
      {
        ...component,
        isComponent: !!components[component.element],
        level,
      },
    ].concat(
      flattenPage(components, component.children, level + 1).filter(Boolean),
    );
  }

  return [{
    ...component,
    isComponent: !!components[component.element],
    level,
  }];
}

function addIndices<A>(arr: A[]): (A & Index)[] {
  return arr.map((o, index) => ({ ...o, index }));
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
  pageItem: PageItem & Index,
  setState: setState<{
    pageElements: PageElements;
  }>,
) {
  setState(({ pageElements }) => {
    const body = document.getElementById("pagebody");
    const element = findElement(body, pageItem, pageElements);

    for (const element of hoveredElements.values()) {
      element.classList.remove("border");
      element.classList.remove("border-red-800");

      hoveredElements.delete(element);
    }

    if (element) {
      element.classList.add("border");
      element.classList.add("border-red-800");

      hoveredElements.add(element);
    }

    return { selected: pageItem };
    // @ts-ignore Improve type
  }, { parent: "editorContainer" });
}

function elementChanged(
  value: string,
  setState: setState<
    {
      selected: PageItem & Index;
      pageElements: PageElements;
    }
  >,
) {
  setState(
    ({ selected, pageElements }) => {
      const body = document.getElementById("pagebody");
      const element = findElement(body, selected, pageElements);

      if (element) {
        // TODO: Update element type
        // https://stackoverflow.com/a/59147202/228885
      }

      // TODO: Update match at the page object
      return {
        selected: {
          ...selected,
          element: value,
        },
        pageElements: pageElements.map((element) =>
          selected.index === element.index
            ? { ...element, element: value }
            : element
        ),
      };
    },
  );
}

function contentChanged(
  value: string,
  setState: setState<
    {
      selected: PageItem & Index;
      pageElements: PageElements;
    }
  >,
) {
  setState(
    ({ selected, pageElements }) => {
      const body = document.getElementById("pagebody");
      const element = findElement(body, selected, pageElements);

      if (element) {
        element.innerHTML = value;
      }

      // TODO: Update match at the page object
      return {
        selected: {
          ...selected,
          children: value,
        },
        pageElements: pageElements.map((element) =>
          selected.index === element.index
            ? { ...element, children: value }
            : element
        ),
      };
    },
  );
}

function classChanged(
  value: string,
  setState: setState<
    {
      selected: PageItem & Index;
      pageElements: PageElements;
    }
  >,
) {
  setState(
    ({ selected, pageElements }) => {
      const body = document.getElementById("pagebody");
      const element = findElement(body, selected, pageElements);

      if (element) {
        element.setAttribute("class", value);

        // TODO: Is there a nicer way to retain selection?
        element.classList.add("border");
        element.classList.add("border-red-800");
      }

      // TODO: Update match at the page object
      return {
        selected: {
          ...selected,
          class: value,
        },
        pageElements: pageElements.map((element) =>
          selected.index === element.index
            ? { ...element, class: value }
            : element
        ),
      };
    },
  );
}

function findElement(
  parent: HTMLElement | null,
  pageItem: PageItem & Index,
  pageElements: PageElements,
): HTMLElement | undefined {
  if (!parent) {
    return;
  }

  const { index } = pageItem;
  let currentIndex = -1;

  function traverse(parent: HTMLElement): HTMLElement | undefined {
    for (const child of Array.from(parent.children)) {
      currentIndex++;

      if (index === currentIndex) {
        return child as HTMLElement;
      }

      const matchedPageItem = pageElements[currentIndex];

      if (!matchedPageItem.isComponent) {
        if (!matchedPageItem.__bind) {
          const ret = traverse(child as HTMLElement);

          if (ret) {
            return ret;
          }
        }
      }
    }
  }

  return traverse(parent);
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
