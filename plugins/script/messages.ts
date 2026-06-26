import type { PluginApi, Send } from "../../types.ts";
import type {
  FoundScript,
  ReceivedGlobalScript,
  ReceivedScript,
  ScriptPluginContext,
} from "./types.ts";

async function handleScriptMessage({
  loadScripts,
  message,
  pluginContext,
  send,
}: {
  loadScripts(): Promise<FoundScript[]>;
  message: Parameters<
    NonNullable<PluginApi<ScriptPluginContext>["onMessage"]>
  >[0]["message"];
  pluginContext: ScriptPluginContext;
  send: Send;
}) {
  const { type, payload } = message;

  if (type === "fileChanged") {
    return await handleScriptFileChangedMessage(payload, loadScripts);
  }

  if (type === "addGlobalScripts") {
    return handleAddGlobalScriptsMessage(payload, pluginContext, send);
  }

  if (type === "addScripts") {
    return handleAddScriptsMessage(payload, pluginContext, send);
  }
}

async function handleScriptFileChangedMessage(
  payload: { type: string },
  loadScripts: () => Promise<FoundScript[]>,
) {
  if (payload.type !== "foundScripts") {
    return;
  }

  const foundScripts = await loadScripts();

  // TODO: Make this more refined by sending a replaceScript event
  // and the script that changed so that it can be replaced as
  // that avoids a full page reload.
  return {
    send: [{ type: "reloadPage" as const, payload: undefined }],
    pluginContext: { foundScripts },
  };
}

function handleAddGlobalScriptsMessage(
  payload: ReceivedGlobalScript[],
  pluginContext: ScriptPluginContext,
  send: Send,
) {
  payload.forEach(({ src: path }) => addScriptDynamicRoute(send, path));

  return {
    pluginContext: {
      receivedGlobalScripts:
        pluginContext.receivedGlobalScripts.concat(payload),
    },
  };
}

function handleAddScriptsMessage(
  payload: ReceivedScript[],
  pluginContext: ScriptPluginContext,
  send: Send,
) {
  payload.forEach(({ name: path }) => addScriptDynamicRoute(send, path));

  return {
    pluginContext: {
      receivedScripts: pluginContext.receivedScripts.concat(payload),
    },
  };
}

function addScriptDynamicRoute(send: Send, path: string) {
  // TODO: Scope to router- instead
  send("*", { type: "addDynamicRoute", payload: { path } });
}

export { handleScriptMessage };
