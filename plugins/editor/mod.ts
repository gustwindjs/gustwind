import { attachIds } from "../../utilities/attachIds.ts";
import { path } from "../../server-deps.ts";
import type { PluginApi, PluginMeta, PluginParameters } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-editor-plugin",
  dependsOn: [
    "breezewind-renderer-plugin",
    "gustwind-twind-plugin",
    "gustwind-script-plugin",
  ],
};

const scriptsToCompile = [
  "toggleEditor",
  "pageEditor",
  // toggleEditor pulls twindRuntime so it doesn't have to be compiled/loaded
  // separately
  // "twindRuntime",
];

function editorPlugin({ projectMeta }: PluginParameters): PluginApi {
  return {
    beforeEachRender({ url, send, route, context }) {
      const outputDirectory = path.join(projectMeta.outputDirectory, url);

      const lookup = {
        context,
        layout: send(
          "breezewind-renderer-plugin",
          { type: "getRenderer", payload: route.layout },
        ),
        route,
      };

      return route.type === "xml"
        ? []
        : ["context", "layout", "route"].map((name) => ({
          type: "writeFile",
          payload: {
            outputDirectory,
            file: `${name}.json`,
            // @ts-expect-error We know name is suitable by now
            data: JSON.stringify(lookup[name]),
          },
        }));
    },
    sendMessages: ({ send }) => {
      const cwd = Deno.cwd();

      send("gustwind-script-plugin", {
        type: "addScripts",
        payload: scriptsToCompile.map((name) => ({
          // TODO: How to make this work in the remote case?
          path: path.join(cwd, "plugins", "editor", "scripts", `${name}.ts`),
          name: `${name}.js`,
        })),
      });
    },
    prepareBuild: async ({ send }) => {
      const components = await send("breezewind-renderer-plugin", {
        type: "getComponents",
        payload: undefined,
      });

      return [{
        type: "writeFile",
        payload: {
          outputDirectory: projectMeta.outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      }];
    },
    prepareContext: async ({ route, send }) => {
      const id = "breezewind-renderer-plugin";

      const components = await send(id, {
        type: "getComponents",
        payload: undefined,
      });
      send(id, {
        type: "updateComponents",
        payload: Object.fromEntries(
          // @ts-expect-error This is fine.
          Object.entries(components).map((
            [k, v],
            // @ts-expect-error This is fine.
          ) => [k, attachIds(v)]),
        ),
      });

      const layouts = await send(id, {
        type: "getLayouts",
        payload: undefined,
      });
      send(id, {
        type: "updateLayouts",
        payload: Object.fromEntries(
          // @ts-expect-error This is fine.
          Object.entries(layouts).map((
            [k, v],
            // @ts-expect-error This is fine.
          ) => [k, route.type === "xml" ? v : attachIds(v)]),
        ),
      });
    },
  };
}

export { editorPlugin as plugin, meta };
