import getMarkdown from "../transforms/markdownSatteri.ts";
import type { DataSourcesApi } from "../../types.ts";

function init({ load, render, renderRaw, renderSync }: DataSourcesApi) {
  const markdown = getMarkdown({ load, render, renderRaw, renderSync });

  return {
    processMarkdown: async (input: unknown) => (await markdown(input)).content,
  };
}

export { init };
