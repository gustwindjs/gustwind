import getMarkdown from "../transforms/markdown.ts";
import type { DataSourcesApi } from "../../types.ts";

function init({ load, render, renderSync }: DataSourcesApi) {
  const markdown = getMarkdown({ load, render, renderSync });

  return {
    processMarkdown: async (input: string) => (await markdown(input)).content,
  };
}

export { init };
