import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { path } from "../../server-deps.ts";
import scriptsToCompile from "./scriptsToCompile.ts";
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
    let twindSetupPath = "";

    return {
      beforeEachRender: async ({ context, url, send, route }) => {
        const outputDir = path.join(outputDirectory, url);

        const lookup = {
          context,
          layout: await send(
            "breezewind-renderer-plugin",
            { type: "getRenderer", payload: route.layout },
          ),
          route,
        };

        return url.endsWith(".xml")
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
      onMessage: ({ message }) => {
        const { type, payload } = message;

        if (type === "twindSetupReady") {
          twindSetupPath = payload.path;
        }
      },
      sendMessages: ({ send }) => {
        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: scriptsToCompile.map(({ isExternal, name, externals }) => {
            // TODO: Find some simplification for this
            return ({
              isExternal,
              localPath: path.join(
                cwd,
                "plugins",
                "editor",
                "scripts",
                `${name}.ts`,
              ),
              // TODO: It would be good to take gustwind version into account
              remotePath: urlJoin(
                "https://deno.land/x/gustwind",
                "plugins",
                "editor",
                "compiled-scripts",
                `${name}.ts`,
              ),
              name: `${name}.js`,
              externals,
            });
          }).concat({
            isExternal: true,
            localPath: twindSetupPath,
            remotePath: twindSetupPath,
            name: "twindSetup.js",
            externals: [],
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
    };
  },
};

export { plugin };
