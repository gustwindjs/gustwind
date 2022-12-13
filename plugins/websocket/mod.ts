import { getWebsocketServer } from "../../utilities/getWebSocketServer.ts";
import type { PluginApi, PluginMeta, PluginParameters } from "../../types.ts";

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

  return {
    onMessage({ type, payload }) {
      switch (type) {
        case "fileChanged":
          // TODO: Define different types of updates here based on file extension for example
          console.log("file changed", payload);
          break;
      }
    },
  };
}

export { meta, webSocketPlugin as plugin };
