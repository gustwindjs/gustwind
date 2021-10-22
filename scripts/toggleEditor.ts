/// <reference lib="dom" />
import { importScript } from "../src/importScript.ts";
import { zipToObject } from "../src/utils.ts";
import type { Component, Index, PageItem } from "../types.ts";

const editorsId = "editors";

let socket: WebSocket;
let pagePath: string;

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

  if (location.hostname === "localhost") {
    const pagepathElement = document.getElementById("pagepath");

    if (!pagepathElement) {
      console.error("#pagepath was not found!");

      return;
    }

    pagePath = pagepathElement.dataset.pagepath as string;

    console.log("Loading web socket client");

    await importScript("./webSocketClient.js");

    // @ts-ignore Fix the type
    socket = window.createWebSocket(pagePath);

    console.log(socket, pagePath);

    const updateElement = document.createElement("div");
    updateElement.setAttribute("x", "updateFileSystem(state)");
    editorsElement.appendChild(updateElement);
  }

  try {
    await importScript("/pageEditor.js");

    // @ts-ignore TODO: Share window type better
    window.createEditor(editorsElement);
  } catch (err) {
    console.error(err);
  }
}

function updateFileSystem(state: {
  meta: { field: string; value: string }[];
  dataSources: {
    state: { field: string; value: string }[];
  }[];
  pageElements: (PageItem & Index)[];
}) {
  console.log("update file system", state, socket, pagePath);
  const meta = zipToObject(
    state.meta.map(({ field, value }) => [field, value]),
  );
  const dataSources = state.dataSources.map(({ state }) =>
    zipToObject(state.map(({ field, value }) => [field, value]))
  );
  const page = serializePage(state.pageElements);

  console.log(meta, dataSources, page);

  // TODO: Trigger this through sidewind when data changes
  /*
    socket.send(JSON.stringify({
    type: "update",
    payload: {
      path: pagePath,
      data,
    },
  }));
  */
}

// TODO: Find a good algorithm for this
function serializePage(elements: (PageItem & Index)[]): Component[] {
  // const simplified = elements.map(({ isComponent, index, ...rest }) => rest);
  const ret: Component[] = [];

  // TODO: Handle siblings + string children
  // TODO: Instead of previous element, track previous parent!
  let previousElement: PageItem | null = null;
  for (const element of elements) {
    if (previousElement) {
      if (previousElement.level === element.level) {
        previousElement = { ...element, children: [] };

        ret.push(previousElement);
      } else {
        const cleanedElement = { ...element, children: [] } as PageItem;

        if (Array.isArray(previousElement.children)) {
          previousElement.children?.push(cleanedElement);

          previousElement = cleanedElement;
        }
      }
    } else {
      previousElement = { ...element, children: [] };

      ret.push(previousElement);
    }
  }
  // TODO: Omit level from each

  return ret;
}

// TODO: Figure out what the error means
declare global {
  interface Window {
    toggleEditor: typeof toggleEditor;
    updateFileSystem: typeof updateFileSystem;
  }
}

window.toggleEditor = toggleEditor;
window.updateFileSystem = updateFileSystem;
