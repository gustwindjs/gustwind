/// <reference lib="dom" />
import { setup } from "twind-shim";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import { renderComponent } from "../src/renderComponent.ts";
import type { Component, Components, DataContext, Page } from "../types.ts";

console.log("Hello from the page editor");

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

async function createEditor(parent: HTMLElement) {
  const components: Components = await fetch("/components.json").then((res) =>
    res.json()
  );
  const context: DataContext = await fetch("./context.json").then((res) =>
    res.json()
  );

  fetch("./definition.json").then((res) => res.json()).then(
    (pageDefinition) => {
      renderTree(parent, components, context, pageDefinition);
      renderControls(parent, components, context);
    },
  );
}

type PageElements = (PageItem & Index)[];

async function renderTree(
  parent: HTMLElement,
  components: Components,
  context: DataContext,
  pageDefinition: Page,
) {
  const treeElement = document.createElement("div");
  treeElement.innerHTML = await renderComponent(
    components.documentTree,
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
  setState({ meta, dataSources, pageElements }, {
    element: treeElement,
    parent: "editorContainer",
  });

  // @ts-ignore This is from sidewind
  window.evaluateAllDirectives();
}

async function renderControls(
  parent: HTMLElement,
  components: Components,
  context: DataContext,
) {
  const controlsElement = document.createElement("div");
  controlsElement.innerHTML = await renderComponent(
    components.elementControls,
    components,
    context,
  );

  parent.appendChild(controlsElement);

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

type PageItem = ({
  isComponent: boolean;
  level: number;
} & Component);

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

type Index = { index: number };

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

const hoveredElements: Element[] = [];

function elementHovered(
  pageItem: PageItem & Index,
  setState: setState<{
    pageElements: PageElements;
  }>,
) {
  setState(({ pageElements }) => {
    const body = document.getElementById("pagebody");
    const element = findElement(body, pageItem, pageElements);

    hoveredElements.forEach((element) => {
      element.classList.remove("border");
      element.classList.remove("border-red-800");
    });

    if (element) {
      element.classList.add("border");
      element.classList.add("border-red-800");

      hoveredElements.push(element);
    }

    return { selected: pageItem };
    // @ts-ignore Improve type
  }, { parent: "editorContainer" });
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
    metaChanged: typeof metaChanged;
    elementHovered: typeof elementHovered;
    contentChanged: typeof contentChanged;
  }
}

window.createEditor = createEditor;
window.metaChanged = metaChanged;
window.elementHovered = elementHovered;
window.contentChanged = contentChanged;
