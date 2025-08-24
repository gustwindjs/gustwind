import * as path from "node:path";
import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { getWebsocketServer } from "../../utilities/getWebSocketServer.ts";
import scriptsToCompile from "./scriptsToCompile.ts";
import { VERSION } from "../../version.ts";
import type { Plugin } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const plugin: Plugin<{ wss: ReturnType<typeof getWebsocketServer> }> = {
  meta: {
    name: "websocket-plugin",
    description:
      "${name} implements a websocket based refresh for the browser that triggers when a file is changed in the project.",
    dependsOn: ["gustwind-script-plugin"],
  },
  init: ({ cwd, mode, options: { wss } }) => {
    if (mode !== "development") {
      return {};
    }

    function sendMessage(message: { type: string; payload: unknown }) {
      DEBUG &&
        console.log(
          "websocket-plugin - sending to wss plugins",
          wss,
          message,
        );

      wss.send(JSON.stringify(message));
    }

    return {
      sendMessages: ({ send }) => {
        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: scriptsToCompile.map(({ name }) => ({
            localPath: path.join(
              cwd,
              "plugins",
              "websocket",
              "scripts",
              `${name}.ts`,
            ),
            remotePath: urlJoin(
              `https://deno.land/x/gustwind@v${VERSION}`,
              "plugins",
              "websocket",
              "compiled-scripts",
              `${name}.ts`,
            ),
            name: `${name}.js`,
          })),
        });
      },
      onMessage({ message: { type } }) {
        if (type === "reloadPage") {
          DEBUG && console.log("websocket-plugin - reload page");

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
