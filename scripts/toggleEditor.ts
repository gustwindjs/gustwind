/// <reference lib="dom" />
import { importScript } from "../src/importScript.ts";
import { zipToObject } from "../src/utils.ts";
import type { Page } from "../types.ts";

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
    "{ meta: [], dataSources: [], page: [] }",
  );
  editorsElement.setAttribute("x-label", "editor");

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
  dataSources: { field: string; value: string }[][];
  page: Page["page"];
}) {
  const meta = zipToObject(
    state.meta.map(({ field, value }) => [field, value]),
  );
  const dataSources = state.dataSources.map((dataSource) =>
    zipToObject(dataSource.map(({ field, value }) => [field, value]))
  );
  const page = state.page;

  // TODO: Don't send if payload didn't change
  socket.send(JSON.stringify({
    type: "update",
    payload: {
      path: pagePath,
      data: { meta, dataSources, page },
    },
  }));
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
