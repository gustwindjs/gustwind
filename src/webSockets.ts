import { WebSocketServer } from "websockets";
import type { Page } from "../types.ts";

type WebSocketMessage = {
  type: "update";
  payload: { path: string; data: Page };
};

const getWebsocketServer = (port = 8080) => {
  const wss = new WebSocketServer(port);

  wss.on("connection", (ws) => {
    console.log("wss - Connected");

    ws.send(JSON.stringify({ type: "log", payload: "connected" }));

    ws.on("message", (message: string) => {
      const { type, payload: { path, data } }: WebSocketMessage = JSON.parse(
        message,
      );

      if (type === "update") {
        ws.send(JSON.stringify({ type: "log", payload: `received ${type}` }));

        Deno.writeTextFile(path, JSON.stringify(data, null, 2) + "\n").then(
          () =>
            ws.send(
              JSON.stringify({ type: "log", payload: `wrote to ${path}` }),
            ),
        )
          .catch((err) => ws.send(`error: ${err}`));
      }
    });
  });

  return wss;
};

const websocketClient = `const socket = new WebSocket('ws://localhost:8080');
  
socket.addEventListener('message', (event) => {
  let type, payload;

  try {
    const data = JSON.parse(event.data);

    type = data.type;
    payload = data.payload;
  } catch(err) {
    console.error(event, err);

    return;
  }

  if (type === 'log') {
    console.log('WebSocket', payload);
  }
  else if (type === 'refresh') {
    console.log('WebSocket', 'refreshing');

    const container = document.getElementById("pagebody");
    container.innerHTML = payload.bodyMarkup;

    document.querySelector("title").innerHTML = payload.meta.title;
    Object.entries(payload.meta).forEach(([k, v]) => {
      const element = document.head.querySelector("meta[name='" + k + "']");

      if (element) {
        element.setAttribute('content', v);
      }
      else {
        console.error('WebSocket', 'meta element not found for', k);
      }
    })
  }
  else {
    console.log('WebSocket', 'unknown event', event);
  }
});`
  .split("\n")
  .join("");

export { getWebsocketServer, websocketClient };
