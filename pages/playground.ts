/// <reference lib="dom" />

import "sidewind";
import { setup } from "twind-shim";
import JSONEditor from "jsoneditor";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";

import { renderBody } from "../src/renderBody.ts";
import type { Page } from "../types.ts";

console.log("Hello from the playground again");

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

/*
function createPlaygroundEditor(
  elementSelector: string,
  dataSelector: string,
  bodySelector: string,
) {
  const container = document.getElementById(bodySelector);

  if (!container) {
    console.error("Failed to find #pagebody");

    return;
  }

  const editor = new JSONEditor(document.getElementById(elementSelector), {
    onChangeJSON: async (pageJson: Page) => {
      const bodyMarkup = await renderBody(
        pageJson,
        pageJson.page,
        {}, // TODO: Components should go here - load through data as well
        {}, // Data context is empty for now
        "/playground/", // hard coded for now
      );

      container.innerHTML = bodyMarkup;
    },
  });

  const dataElement = document.getElementById(dataSelector);

  dataElement &&
    editor.set(JSON.parse(decodeURIComponent(dataElement.dataset.page || "")));
}

declare global {
  interface Window {
    createPlaygroundEditor: typeof createPlaygroundEditor;
  }
}

window.createPlaygroundEditor = createPlaygroundEditor;
*/
