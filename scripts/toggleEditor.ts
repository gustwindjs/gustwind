/// <reference lib="dom" />
import { setup } from "twind-shim";
import { tw } from "twind";
import produce from "immer";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";
import { importScript } from "../src/importScript.ts";
import { traversePage } from "../src/traversePage.ts";
import type { Page } from "../types.ts";

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

const editorsId = "editors";

let socket: WebSocket;

function init() {
  const toggleButton = document.createElement("button");
  toggleButton.className = tw(
    "fixed right-4 bottom-4 whitespace-nowrap text-lg",
  );
  toggleButton.innerText = "🐳💨";
  toggleButton.onclick = toggleEditor;

  document.body.appendChild(toggleButton);
}

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
    "{ meta: [], dataSources: [], page: [], matchBy: {} }",
  );
  editorsElement.setAttribute("x-label", "editor");

  document.body.appendChild(editorsElement);

  // TODO: Push this logic inside pageEditor
  if (location.hostname === "localhost") {
    console.log("Loading web socket client");

    await importScript("./webSocketClient.js");

    // @ts-ignore Fix the type
    socket = window.createWebSocket(getPagePath());

    //const updateElement = document.createElement("div");
    //updateElement.setAttribute("x", "updateFileSystem(state)");
    //editorsElement.appendChild(updateElement);
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
  const nextPage = produce(state.page, (draftPage: Page["page"]) => {
    traversePage(draftPage, (p) => {
      // TODO: Generalize to erase anything that begins with a single _
      delete p._id;
      delete p._selected;

      if (p.class === "") {
        delete p.class;
      }
    });
  });

  const payload = {
    path: getPagePath(),
    data: { ...state, page: nextPage },
  };

  // TODO: Don't send if payload didn't change
  socket.send(JSON.stringify({ type: "update", payload }));
}

function getPagePath() {
  const pathElement = document.querySelector('meta[name="pagepath"]');

  if (!pathElement) {
    console.error("path element was not found!");

    return;
  }

  const pagePath = pathElement.getAttribute("content");

  if (!pagePath) {
    console.log("pagePath was not foundin path element");

    return;
  }

  return pagePath;
}

init();

// TODO: Figure out what the error means
declare global {
  interface Window {
    updateFileSystem: typeof updateFileSystem;
  }
}

window.updateFileSystem = updateFileSystem;
