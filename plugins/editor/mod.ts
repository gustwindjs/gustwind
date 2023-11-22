import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { path } from "../../server-deps.ts";
import scriptsToCompile from "./scriptsToCompile.ts";
import { VERSION } from "../../version.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<undefined, { styleSetupPath: string }> = {
  meta: {
    name: "gustwind-editor-plugin",
    description: "${name} implements a live editor.",
    dependsOn: [
      "breezewind-renderer-plugin",
      "gustwind-twind-plugin",
      "gustwind-script-plugin",
    ],
  },
  init({ cwd, outputDirectory }) {
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
            type: "writeTextFile",
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

        if (type === "styleSetupReady") {
          return { pluginContext: { styleSetupPath: payload.path } };
        }
      },
      sendMessages: ({ send, pluginContext }) => {
        const { styleSetupPath } = pluginContext;

        if (!styleSetupPath) {
          throw new Error("gustwind-editor-plugin - missing styleSetupPath!");
        }

        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: scriptsToCompile.map(({ isExternal, name, externals }) => ({
            isExternal,
            localPath: path.join(
              cwd,
              "plugins",
              "editor",
              "scripts",
              `${name}.ts`,
            ),
            remotePath: urlJoin(
              `https://deno.land/x/gustwind@v${VERSION}`,
              "plugins",
              "editor",
              "compiled-scripts",
              `${name}.ts`,
            ),
            name: `${name}.js`,
            externals,
          })).concat({
            isExternal: true,
            localPath: styleSetupPath,
            remotePath: styleSetupPath,
            name: "styleSetup.js",
            externals: [],
          }),
        });
        send("gustwind-script-plugin", {
          type: "addGlobalScripts",
          payload: [{
            type: "text/javascript",
            src:
              "https://unpkg.com/sidewind@7.6.0/dist/sidewind.umd.production.min.js",
          }],
        });
      },
      prepareBuild: async ({ send }) => {
        const components = await send("breezewind-renderer-plugin", {
          type: "getComponents",
          payload: undefined,
        });

        return [{
          type: "writeTextFile",
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
