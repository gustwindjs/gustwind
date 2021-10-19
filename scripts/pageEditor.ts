/// <reference lib="dom" />
import { setup } from "twind-shim";
import { tw } from "twind";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
// import updateMeta from "../src/updateMeta.ts";
// import { renderBody } from "../src/renderBody.ts";
import type { Page } from "../types.ts";

console.log("Hello from the page editor");

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

const pageEditorId = "pageEditor";

function createPlaygroundEditor() {
  const stylesheet = document.createElement("link");
  stylesheet.setAttribute("rel", "stylesheet");
  stylesheet.setAttribute("type", "text/css");
  stylesheet.setAttribute(
    "href",
    "https://cdn.jsdelivr.net/gh/josdejong/jsoneditor/dist/jsoneditor.min.css",
  );

  document.body.appendChild(stylesheet);

  const mainElement = document.querySelector("main");

  if (!mainElement) {
    console.error("Failed to find body element");

    return;
  }

  const pageEditorElement = document.createElement("div");
  pageEditorElement.setAttribute("id", pageEditorId);
  pageEditorElement.setAttribute(
    "class",
    tw`fixed bg-white bottom-0 w-full max-h-1/2`,
  );

  mainElement.parentNode?.insertBefore(
    pageEditorElement,
    mainElement.nextSibling,
  );

  // const components = await fetch("/components.json").then((res) => res.json());
  // const context = await fetch("./context.json").then((res) => res.json());

  /*
  const editor = new JSONEditor(pageEditorElement, {
    onChangeJSON: async (pageJson: Page) => {
      updateMeta(pageJson.meta);

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
      document.body.appendChild(renderTree(pageDefinition));
      document.body.appendChild(renderControls());
    },
  );
}

function renderTree(pageDefinition: Page) {
  const treeElement = document.createElement("div");
  treeElement.className = tw([
    "fixed",
    "top-0",
    "left-0",
    "ml-4",
    "mt-16",
    "p-4",
    "bg-white",
  ]);
  treeElement.innerHTML = "hello from tree structure";

  // TODO: Render tree structure based on page definition
  // dataSources, meta, page
  console.log(pageDefinition);

  return treeElement;
}

function renderControls() {
  const controlsElement = document.createElement("div");
  controlsElement.className = tw([
    "fixed",
    "top-0",
    "right-0",
    "mr-4",
    "mt-16",
    "p-4",
    "bg-white",
  ]);
  controlsElement.innerHTML = "hello from controls";

  return controlsElement;
}

createPlaygroundEditor();
