import getMarkdown from "../transforms/markdown.ts";
import type { LoadApi } from "../../types.ts";

function init({ load }: { load: LoadApi }) {
  const markdown = getMarkdown(load);

  return {
    processMarkdown: async (input: string) => (await markdown(input)).content,
  };
}

export { init };
