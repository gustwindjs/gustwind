import { attachIds } from "../../utilities/attachIds.ts";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin = {
  meta: {
    name: "gustwind-editor-plugin",
    dependsOn: [
      "breezewind-renderer-plugin",
      "gustwind-twind-plugin",
      "gustwind-script-plugin",
    ],
  },
  init: ({ cwd, outputDirectory }) => {
    return {
      beforeEachRender({ context, url, send, route }) {
        const outputDir = path.join(outputDirectory, url);

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
              outputDirectory: outputDir,
              file: `${name}.json`,
              // @ts-expect-error We know name is suitable by now
              data: JSON.stringify(lookup[name]),
            },
          }));
      },
      sendMessages: ({ send }) => {
        const scriptsToCompile = [
          "toggleEditor",
          "pageEditor",
          // toggleEditor pulls twindRuntime so it doesn't have to be compiled/loaded
          // separately
          // "twindRuntime",
        ];

        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: scriptsToCompile.map((name) => {
            // TODO: Find some simplification for this
            return ({
              localPath: path.join(
                cwd,
                "plugins",
                "editor",
                "scripts",
                `${name}.ts`,
              ),
              // TODO: It would be good to take gustwind version into account
              remotePath: path.join(
                "https://deno.land/x/gustwind",
                "plugins",
                "editor",
                "compiled-scripts",
                `${name}.ts`,
              ),
              name: `${name}.js`,
            });
          }),
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
            outputDirectory,
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
  },
};

export { plugin };
