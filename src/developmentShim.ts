/// <reference lib="dom" />
import JSONEditor from "jsoneditor";
import { setup } from "twind-shim";
import sharedTwindSetup from "./sharedTwindSetup.ts";

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

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

    const title = document.querySelector("title");

    if (title) {
      title.innerHTML = payload.meta.title;
    } else {
      console.warn(`The page doesn't have a <title>!`);
    }

    Object.entries(payload.meta).forEach(([k, v]) => {
      const element = document.head.querySelector("meta[name='" + k + "']");

      if (element) {
        // TODO: Type better by typing possible web socket messages
        element.setAttribute("content", v as string);
      } else {
        console.error("WebSocket", "meta element not found for", k);
      }
    });
  } else {
    console.log("WebSocket", "unknown event", event);
  }
});

function createJSONEditor(element: HTMLElement, path: string, data: string) {
  const editor = new JSONEditor(element, {
    onChangeJSON(data: string) {
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
  }
}

window.createJSONEditor = createJSONEditor;
