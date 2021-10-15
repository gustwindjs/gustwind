/// <reference lib="dom" />
import JSONEditor from "jsoneditor";
import { setup } from "twind-shim";
import sharedTwindSetup from "./sharedTwindSetup.ts";
import updateMeta from "./updateMeta.ts";
import type { Page } from "../types.ts";

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

function createWebSocket(path: string) {
  const socket = new WebSocket("ws://localhost:8080");

  socket.addEventListener("message", (event) => {
    let type, payload;

    try {
      const data = JSON.parse(event.data);

      type = data.type;
      payload = data.payload;
    } catch (err) {
      console.error(event, err);

      return;
    }

    if (type === "log") {
      console.log("WebSocket", payload);
    } else if (type === "refresh") {
      console.log("WebSocket", "refreshing");

      const container = document.getElementById("pagebody");

      if (!container) {
        console.error("Failed to find #pagebody");

        return;
      }

      container.innerHTML = payload.bodyMarkup;

      updateMeta(payload.meta);
    } else if (type === "reload") {
      console.log("Websocket", "reloading");

      socket.send(JSON.stringify({
        type: "reload",
        payload: {
          path,
        },
      }));
    } else {
      console.log("WebSocket", "unknown event", event);
    }
  });

  return socket;
}

function createJSONEditor(
  socket: WebSocket,
  element: HTMLElement,
  path: string,
  data: string,
) {
  const editor = new JSONEditor(element, {
    onChangeJSON(data: Page) {
      socket.send(JSON.stringify({
        type: "update",
        payload: {
          path,
          data,
        },
      }));
    },
  });

  editor.set(data);
}

declare global {
  interface Window {
    createJSONEditor: typeof createJSONEditor;
    createWebSocket: typeof createWebSocket;
  }
}

window.createJSONEditor = createJSONEditor;
window.createWebSocket = createWebSocket;
