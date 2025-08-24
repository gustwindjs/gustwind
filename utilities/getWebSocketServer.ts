type WebSocketMessage = {
  type: "update";
  payload: { path: string; data: unknown };
};

// https://docs.deno.com/examples/http_server_websocket/
// https://docs.deno.com/api/web/~/WebSocket
const getWebsocketServer = (port = 8080) => {
  let s: WebSocket | null = null;

  Deno.serve(
    {
      port,
      hostname: "127.0.0.1",
      onListen() {
        console.log(`WS server started at ${port}`);
      },
    },
    (req) => {
      if (req.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 426 });
      }
      const { socket, response } = Deno.upgradeWebSocket(req);
      s = socket;

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "log", payload: "connected" }));
      });
      socket.addEventListener("message", (event) => {
        const { type, payload: { path, data } }: WebSocketMessage = JSON.parse(
          event.data,
        );

        if (type === "update") {
          socket.send(
            JSON.stringify({ type: "log", payload: `received ${type}` }),
          );

          Deno.writeTextFile(path, JSON.stringify(data, null, 2) + "\n").then(
            () =>
              socket.send(
                JSON.stringify({ type: "log", payload: `wrote to ${path}` }),
              ),
          )
            .catch((err) => socket.send(`error: ${err}`));
        } else if (type === "reload") {
          socket.send(
            JSON.stringify({ type: "log", payload: `received ${type}` }),
          );

          // TODO: Use Deno.Command instead
          Deno.run({ cmd: ["touch", path] });
        }
      });

      return response;
    },
  );

  return {
    send: (message: string) => {
      s?.send(message);
    },
  };
};

export { getWebsocketServer };
