/// <reference lib="dom" />
import { setup } from "twind-shim";
import { tw } from "twind";
import JSONEditor from "jsoneditor";
import sharedTwindSetup from "../src/sharedTwindSetup.ts";
import updateMeta from "../src/updateMeta.ts";
import { renderBody } from "../src/renderBody.ts";
import type { Page } from "../types.ts";

console.log("Hello from the page editor");

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

const pageEditorId = "pageEditor";

async function createPlaygroundEditor() {
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

  const components = await fetch("/components.json").then((res) => res.json());
  const context = await fetch("./context.json").then((res) => res.json());

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

      console.log(pageJson, bodyMarkup);

      mainElement.innerHTML = bodyMarkup;
    },
  });

  console.log("Set up the page editor");

  fetch("./definition.json").then((res) => res.json()).then((d) => {
    console.log("Loaded page definition to the editor");

    editor.set(d);
  });
}

createPlaygroundEditor();
