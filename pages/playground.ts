/// <reference lib="dom" />
import "sidewind";
import { setup } from "twind-shim";
import { tw } from "twind";
import JSONEditor from "jsoneditor";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import updateMeta from "../src/updateMeta.ts";
import { renderBody } from "../src/renderBody.ts";
import type { Page } from "../types.ts";

console.log("Hello from the playground");

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
  pageEditorElement.style.visibility = "hidden";

  mainElement.parentNode?.insertBefore(
    pageEditorElement,
    mainElement.nextSibling,
  );

  const editor = new JSONEditor(pageEditorElement, {
    onChangeJSON: async (pageJson: Page) => {
      updateMeta(pageJson.meta);

      const bodyMarkup = await renderBody(
        pageJson,
        pageJson.page,
        {}, // TODO: Components should go here - load through data as well
        {}, // Data context is empty for now
        "/playground/", // hard coded for now
      );

      mainElement.innerHTML = bodyMarkup;
    },
  });

  fetch("./definition.json").then((res) => res.json()).then((d) =>
    editor.set(d)
  );
}

createPlaygroundEditor();

function toggleEditor() {
  const mainElement = document.querySelector("main");

  if (!mainElement) {
    console.error("Failed to find body element");

    return;
  }

  mainElement.dataset.visible = mainElement.dataset.visible === "true"
    ? "false"
    : "true";

  const pageEditorElement = document.getElementById(pageEditorId);

  if (!pageEditorElement) {
    console.error("Failed to find page editor element");

    return;
  }

  if (mainElement.dataset.visible === "true") {
    pageEditorElement.style.visibility = "visible";
  } else {
    pageEditorElement.style.visibility = "hidden";
  }
}

declare global {
  interface Window {
    toggleEditor: typeof toggleEditor;
  }
}

window.toggleEditor = toggleEditor;
