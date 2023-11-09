/// <reference lib="dom" />
/// <reference path="../../editor/scripts/pageEditor.ts" />
import { getUrl } from "../../../utilities/getUrl.ts";

function createWebSocket(url?: string) {
  if (!url) {
    console.error("WebSocket", "url is missing!");

    return;
  }

  const socket = new WebSocket("ws://localhost:8080");

  console.log("WebSocket", "connecting");

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

      document.head.innerHTML = payload.headMarkup;
      document.body.innerHTML = payload.bodyMarkup;

      // TODO: Resolve and pass tw here
      window.createEditor && window.createEditor();
    } else if (type === "reload") {
      console.log("Websocket", "reloading");

      socket.send(JSON.stringify({
        type: "reload",
        payload: { path: url },
      }));
    } else if (type === "reloadPage") {
      console.log("Websocket", "reloading page");

      location.reload();
    } else if (type === "replaceScript") {
      const { name } = payload;
      const existingScript = document.querySelector(
        `script[src="${name}"]`,
      ) || document.querySelector(
        `script[data-script="${name}"]`,
      );

      console.log("Websocket", "replacing script");

      if (existingScript) {
        existingScript.remove();

        const script = document.createElement("script");

        script.setAttribute("src", name + "?cache=" + new Date().getTime());
        script.setAttribute("type", "module");
        script.dataset.script = name;

        document.body.appendChild(script);

        // TODO: Resolve and pass tw here
        window.createEditor && window.createEditor();
      }
    } else {
      console.log("WebSocket", "unknown event", event);
    }
  });

  return socket;
}

if (!("Deno" in globalThis)) {
  const developmentSocket = createWebSocket(getUrl());

  window.developmentSocket = developmentSocket;
}

declare global {
  interface Window {
    developmentSocket: ReturnType<typeof createWebSocket>;
  }
}
