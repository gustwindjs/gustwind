import * as websockets from "https://deno.land/x/websocket@v0.1.4/mod.ts";

type WebSocketMessage = {
  type: "update";
  payload: { path: string; data: unknown };
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

        // TODO: Use Deno.Command instead
        Deno.run({ cmd: ["touch", path] });
      }
    });
  });

  return wss;
};

export { getWebsocketServer };
