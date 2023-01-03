import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { path } from "../../server-deps.ts";
import { getWebsocketServer } from "../../utilities/getWebSocketServer.ts";
import scriptsToCompile from "./scriptsToCompile.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{ wss: ReturnType<typeof getWebsocketServer> }> = {
  meta: {
    name: "websocket-plugin",
  },
  init: ({ cwd, mode, options: { wss } }) => {
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
      sendMessages: ({ send }) => {
        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: scriptsToCompile.map(({ name }) => {
            // TODO: Find some simplification for this
            return ({
              localPath: path.join(
                cwd,
                "plugins",
                "websocket",
                "scripts",
                `${name}.ts`,
              ),
              // TODO: It would be good to take gustwind version into account
              remotePath: urlJoin(
                "https://deno.land/x/gustwind",
                "plugins",
                "websocket",
                "compiled-scripts",
                `${name}.ts`,
              ),
              name: `${name}.js`,
            });
          }),
        });
      },
      onMessage({ message: { type } }) {
        if (type === "reloadPage") {
          sendMessage({ type: "reloadPage", payload: {} });
        }

        // TODO: Add a separate event type for replacing scripts
        // and trigger that from the script plugin
        /*
              sendMessage({
                type: "replaceScript",
                payload: { name: `/${name}.js` },
              });
          */
      },
    };
  },
};

export { plugin };
