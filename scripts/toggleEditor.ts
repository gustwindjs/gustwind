/// <reference lib="dom" />
import { importScript } from "../src/importScript.ts";

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

function updateFileSystem(state: any) {
  console.log("update file system", state, socket, pagePath);

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

// TODO: Figure out what the error means
declare global {
  interface Window {
    toggleEditor: typeof toggleEditor;
    updateFileSystem: typeof updateFileSystem;
  }
}

window.toggleEditor = toggleEditor;
window.updateFileSystem = updateFileSystem;
