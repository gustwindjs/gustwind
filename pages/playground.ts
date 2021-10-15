/// <reference lib="dom" />
import "sidewind";
import { setup } from "twind-shim";
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

function createPlaygroundEditor(
  elementSelector: string,
) {
  const stylesheet = document.createElement("link");
  stylesheet.setAttribute("rel", "stylesheet");
  stylesheet.setAttribute("type", "text/css");
  stylesheet.setAttribute(
    "href",
    "https://cdn.jsdelivr.net/gh/josdejong/jsoneditor/dist/jsoneditor.min.css",
  );

  document.body.appendChild(stylesheet);

  const mainElement = document.querySelector("main"); // document.getElementById(bodySelector);

  if (!mainElement) {
    console.error("Failed to find body element");

    return;
  }

  const editorElement = document.getElementById(elementSelector);

  if (!editorElement) {
    console.error("Failed to find editor element");

    return;
  }

  const editor = new JSONEditor(editorElement, {
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

declare global {
  interface Window {
    createPlaygroundEditor: typeof createPlaygroundEditor;
  }
}

window.createPlaygroundEditor = createPlaygroundEditor;
