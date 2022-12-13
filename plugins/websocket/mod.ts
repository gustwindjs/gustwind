import { path as _path } from "../../server-deps.ts";
import { getWebsocketServer } from "../../utilities/getWebSocketServer.ts";
import type { PluginApi, PluginMeta, PluginParameters } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const meta: PluginMeta = {
  name: "websocket-plugin",
};

function webSocketPlugin(
  { mode, options: { wss } }: PluginParameters<
    { wss: ReturnType<typeof getWebsocketServer> }
  >,
): PluginApi {
  if (mode !== "development") {
    return {};
  }

  function sendMessage(message: { type: string; payload: unknown }) {
    wss.clients.forEach((socket) => {
      // 1 for open, https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
      if (socket.state === 1) {
        socket.send(JSON.stringify(message));
      }
    });
  }

  return {
    onMessage({ type, payload }) {
      if (type === "fileChanged") {
        const { path } = payload;
        const ext = _path.extname(path);
        const name = _path.basename(path, ext);

        DEBUG && console.log("file changed", payload, ext);

        switch (ext) {
          // TODO: This is too specific. It would be better if script-plugin
          // caught fileChange and then sent another message with a type of
          // sendMessage to websocket-plugin
          case ".ts":
            // TODO: This should trigger writeScript against the file as well
            // as otherwise the script won't have the latest build
            sendMessage({
              type: "replaceScript",
              payload: { name: `/${name}.js` },
            });
            break;
          // TODO: components - trigger json load (components.json) + send { type: "reloadPage" }
          // TODO: layouts.json - trigger json load + send { type: "reloadPage" }
          // TODO: routes - trigger load + send { type: "reloadPage" }
          // TODO: data sources - trigger load + send { type: "reloadPage" }
          default:
            // meta.json and anything not handled falls here
            sendMessage({ type: "reloadPage", payload: {} });
        }
      }
    },
  };
}

export { meta, webSocketPlugin as plugin };
