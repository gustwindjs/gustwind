import { marked } from "https://unpkg.com/marked@9.1.5/lib/marked.esm.js";

// The component/browser version should not use the regular transform
// as that relies on filesystem related functionality which cannot
// work in the browser. In other words, the component version is
// more limited than the transform.
function init() {
  function processMarkdown(input: string) {
    return marked(input);
  }

  return {
    processMarkdown,
  };
}

export { init };