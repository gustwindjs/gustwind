import md from "../transforms/markdown.ts";

function init() {
  async function processMarkdown(input: string) {
    return (await md(input)).content;
  }

  return {
    processMarkdown,
  };
}

export { init };
