import getMarkdown from "../transforms/markdown.ts";
import type { LoadApi } from "../../types.ts";

// The component/browser version should not use the regular transform
// as that relies on filesystem related functionality which cannot
// work in the browser. In other words, the component version is
// more limited than the transform.
function init({ load }: { load: LoadApi }) {
  const markdown = getMarkdown(load);

  return {
    processMarkdown: async (input: string) => (await markdown(input)).content,
  };
}

export { init };
