/// <reference lib="dom" />
import updateMeta from "../src/updateMeta.ts";

function createWebSocket(pagePath: string) {
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

      const container = document.querySelector("main");

      if (!container) {
        console.error("Failed to find main");

        return;
      }

      // TODO: Restore selection as well?
      container.innerHTML = payload.bodyMarkup;

      updateMeta(payload.meta);

      window.createEditor();
    } else if (type === "reload") {
      console.log("Websocket", "reloading");

      socket.send(JSON.stringify({
        type: "reload",
        payload: { path: pagePath },
      }));
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

        window.createEditor();
      }
    } else {
      console.log("WebSocket", "unknown event", event);
    }
  });

  return socket;
}

declare global {
  interface Window {
    createWebSocket: typeof createWebSocket;
  }
}

window.createWebSocket = createWebSocket;
