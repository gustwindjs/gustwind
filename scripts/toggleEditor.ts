/// <reference lib="dom" />
import { importScript } from "../src/importScript.ts";

const editorsId = "editors";

async function toggleEditor() {
  const mainElement = document.querySelector("main");

  if (!mainElement) {
    console.error("Failed to find body element");

    return;
  }

  let editorsElement = document.getElementById(editorsId);

  if (editorsElement) {
    if (editorsElement.style.visibility === "visible") {
      editorsElement.style.visibility = "hidden";
    } else {
      editorsElement.style.visibility = "visible";
    }

    return;
  }

  editorsElement = document.createElement("div");
  editorsElement.id = editorsId;
  editorsElement.style.visibility = "visible";
  editorsElement.setAttribute(
    "x-state",
    "{ selected: undefined, meta: [], dataSources: [], pageElements: [] }",
  );
  editorsElement.setAttribute("x-label", "editorContainer");

  document.body.appendChild(editorsElement);

  try {
    await importScript("/pageEditor.js");

    // @ts-ignore TODO: Share window type better
    window.createEditor(editorsElement);
  } catch (err) {
    console.error(err);
  }
}

// TODO: Figure out what the error means
declare global {
  interface Window {
    toggleEditor: typeof toggleEditor;
  }
}

window.toggleEditor = toggleEditor;
