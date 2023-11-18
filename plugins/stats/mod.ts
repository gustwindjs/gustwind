import type { Plugin } from "../../types.ts";

const plugin: Plugin<undefined, { startTime: number }> = {
  meta: {
    name: "gustwind-stats-plugin",
    description: "${name} shows basic statistics related to the project build.",
  },
  init({ mode }) {
    if (mode === "development") {
      return {};
    }

    return {
      initPluginContext() {
        return {
          startTime: performance.now(),
        };
      },
      cleanUp: ({ routes, pluginContext }) => {
        const routeAmount = Object.keys(routes).length;
        const endTime = performance.now();
        const duration = endTime - pluginContext.startTime;

        console.log(
          `Generated ${routeAmount} pages in ${duration}ms.\nAverage: ${
            Math.round(
              duration /
                routeAmount * 1000,
            ) / 1000
          } ms per page.`,
        );
      },
    };
  },
};

export { plugin };
