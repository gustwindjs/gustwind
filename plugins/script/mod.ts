import * as path from "node:path";
import { stopEsbuild } from "../../utilities/compileTypeScript.ts";
import type { Plugin, Scripts } from "../../types.ts";
import { normalizeScriptName, prepareScriptBuild } from "./build.ts";
import { prepareScriptContext } from "./context.ts";
import { handleScriptMessage } from "./messages.ts";
import {
  SCRIPT_ASSETS_MANIFEST_PATH,
  type FoundScript,
  type ScriptEntryAsset,
  type ScriptEntryAssets,
  type ScriptPluginContext,
} from "./types.ts";

const plugin: Plugin<
  {
    scripts?: Scripts;
    scriptAssets?: ScriptEntryAssets;
    // TODO: Model scripts output path here
    scriptsPath?: string[];
  },
  {
    foundScripts: FoundScript[];
    receivedScripts: {
      isExternal?: boolean;
      name: string;
      localPath: string;
      remotePath: string;
      externals?: string[];
    }[];
    receivedGlobalScripts: { type: string; src: string }[];
  }
> = {
  meta: {
    name: "gustwind-script-plugin",
    description:
      "${name} implements client-side scripting and exposes hooks for adding scripts to write to the site.",
  },
  init({
    cwd,
    load,
    mode,
    options: { scripts: globalScripts = [], scriptAssets, scriptsPath = [] },
    outputDirectory,
  }) {
    let builtEntryAssets: ScriptEntryAssets = {};

    return {
      initPluginContext: async () => {
        const foundScripts = await loadScripts();

        return { foundScripts, receivedScripts: [], receivedGlobalScripts: [] };
      },
      prepareBuild: ({ pluginContext }) => {
        return prepareScriptBuild({
          cwd,
          mode,
          outputDirectory,
          pluginContext,
          scriptAssets,
          setBuiltEntryAssets(nextBuiltEntryAssets) {
            builtEntryAssets = nextBuiltEntryAssets;
          },
        });
      },
      prepareContext({ route, pluginContext, send }) {
        return prepareScriptContext({
          builtEntryAssets,
          cwd,
          globalScripts,
          mode,
          pluginContext,
          routeScripts: route.scripts || [],
          send,
        });
      },
      onMessage: async ({ message, pluginContext, send }) => {
        return await handleScriptMessage({
          loadScripts,
          message,
          pluginContext,
          send,
        });
      },
      cleanUp: stopEsbuild,
    };

    async function loadScripts(): Promise<
      {
        name: string;
        path: string;
        externals?: string[];
      }[]
    > {
      if (scriptAssets) {
        return Object.keys(scriptAssets).map((name) => ({
          name: `${normalizeScriptName(name)}.ts`,
          path: "",
        }));
      }

      return (
        await Promise.all(
          scriptsPath.map((p) =>
            load.dir({
              path: path.join(cwd, p),
              extension: ".ts",
              type: "foundScripts",
            }),
          ),
        )
      ).flat();
    }
  },
};

export { plugin, SCRIPT_ASSETS_MANIFEST_PATH };
export type { ScriptEntryAsset, ScriptEntryAssets };
