import type { Plugin } from "../../types.ts";

const plugin: Plugin = {
  meta: {
    name: "gustwind-stats-plugin",
    description: "${name} shows basic statistics related to the project build.",
  },
  init({ mode }) {
    if (mode === "development") {
      return {};
    }

    const startTime = performance.now();

    return {
      cleanUp: ({ routes }) => {
        const routeAmount = Object.keys(routes).length;
        const endTime = performance.now();
        const duration = endTime - startTime;

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
