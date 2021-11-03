import { websockets } from "../deps.ts";
import type { Page } from "../types.ts";

type WebSocketMessage = {
  type: "update";
  payload: { path: string; data: Page };
};

const getWebsocketServer = (port = 8080) => {
  const wss = new websockets.WebSocketServer(port);

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
      } else if (type === "reload") {
        ws.send(JSON.stringify({ type: "log", payload: `received ${type}` }));

        Deno.run({ cmd: ["touch", path] });
      }
    });
  });

  return wss;
};

export { getWebsocketServer };
