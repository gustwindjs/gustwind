import * as path from "node:path";
import { createGenerator } from "https://esm.sh/@unocss/core@0.57.2";
import { presetUno } from "https://esm.sh/@unocss/preset-uno@0.57.2";
import { presetWind } from "https://esm.sh/@unocss/preset-wind@0.57.2";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  setupPath: string;
}> = {
  meta: {
    name: "gustwind-uno-plugin",
    description:
      "${name} implements Uno styling integration to the site giving access to Uno semantics.",
    dependsOn: [],
  },
  init: ({ cwd, options }) => {
    const unoSetupPath = path.join(cwd, options.setupPath);
    let uno: ReturnType<typeof createGenerator>;

    async function prepareStylesheet() {
      uno = createGenerator(
        unoSetupPath
          ? await import("file://" + unoSetupPath).then((m) => m.default)
          : { presets: [presetWind(), presetUno()] },
      );
    }

    return {
      prepareBuild: prepareStylesheet,
      prepareContext: prepareStylesheet,
      afterEachRender: async ({ markup, url }) => {
        if (url.endsWith(".xml")) {
          return { markup };
        }

        const { css } = await uno.generate(markup);

        return {
          markup: markup.replace(
            "</head>",
            `<style>${css}</style></head>`,
          ),
        };
      },
      onMessage: ({ message }) => {
        const { type } = message;

        if (type === "getStyleSetupPath") {
          return { result: unoSetupPath };
        }
      },
    };
  },
};

export { plugin };
