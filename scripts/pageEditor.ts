/// <reference lib="dom" />
import { setup } from "twind-shim";
// import { tw } from "twind";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import { renderComponent } from "../src/renderComponent.ts";
// import { renderBody } from "../src/renderBody.ts";
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

  /*
  const editor = new JSONEditor(pageEditorElement, {
    onChangeJSON: async (pageJson: Page) => {
      // TODO: Figure out how to handle transforms (disallow?)
      const bodyMarkup = await renderBody(
        pageJson,
        pageJson.page,
        components,
        context,
        location.pathname,
      );

      mainElement.innerHTML = bodyMarkup;
    },
  });*/

  console.log("Set up the page editor");

  fetch("./definition.json").then((res) => res.json()).then(
    (pageDefinition) => {
      renderTree(parent, components, context, pageDefinition);
      renderControls(parent, components, context);
    },
  );
}

// TODO: Consider eliminating this global
let page: (PageItem & Index)[] = [];

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
  page = addIndices<PageItem>(flattenPage(pageDefinition.page));
  treeElement.setAttribute(
    "x-state",
    `{
    meta: ${JSON.stringify(meta)},
    dataSources: ${JSON.stringify(dataSources)},
    page: ${JSON.stringify(page)}
  }`,
  );
  treeElement.setAttribute("x-label", "parent");
  parent.appendChild(treeElement);

  console.log("page", page);

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

enum Type {
  Component = "component",
  Element = "element",
  String = "string",
}
type PageItem = ({
  level: number;
  type: Type;
} & Component);

function flattenPage(
  component: Component | Component[],
  level = -1,
): PageItem[] {
  if (Array.isArray(component)) {
    return component.flatMap((c) => flattenPage(c, level + 1));
  }
  if (component.children) {
    const ret = [{
      ...component,
      type: getType(component),
      level,
    }];

    if (typeof component.children === "string") {
      return ret;
    }

    return ret.concat(flattenPage(component.children, level + 1));
  }

  return [{ ...component, type: getType(component), level }];
}

type Index = { index: number };

function addIndices<A>(arr: A[]): (A & Index)[] {
  return arr.map((o, index) => ({ ...o, index }));
}

function getType(component: Component) {
  if (component.component) {
    return Type["Component"];
  }
  if (component.element) {
    return Type["Element"];
  }

  return Type["String"];
}

type State = Record<string, unknown>;
type setState = (fn: (state: State) => State) => void;

function metaChanged(value: string, setState: setState) {
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

function elementHovered(pageItem: PageItem & Index) {
  const body = document.getElementById("pagebody");

  console.log("FINDING", pageItem.index);

  const element = findElement(body, pageItem);

  hoveredElements.forEach((element) => {
    element.classList.remove("border");
    element.classList.remove("border-red-800");
  });

  if (element) {
    console.log("found element", element);

    element.classList.add("border");
    element.classList.add("border-red-800");

    hoveredElements.push(element);
  }
}

function findElement(
  parent: HTMLElement | null,
  pageItem: PageItem & Index,
): HTMLElement | undefined {
  if (!parent) {
    return;
  }

  const { index } = pageItem;
  let currentIndex = -1;

  function traverse(parent: HTMLElement): HTMLElement | undefined {
    // TODO: Traverse elements and match (component, element, string)
    for (const child of Array.from(parent.children)) {
      currentIndex++;

      console.log(
        "page item index",
        index,
        "current index",
        currentIndex,
        "child",
        child,
      );

      if (index === currentIndex) {
        return child as HTMLElement;
      }

      const matchedPageItem = page[currentIndex];

      if (matchedPageItem.type === "element") {
        return traverse(child as HTMLElement);
      } else if (matchedPageItem.type === "string") {
        console.log("found string");

        return child as HTMLElement;
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
  }
}

window.createEditor = createEditor;
window.metaChanged = metaChanged;
window.elementHovered = elementHovered;
