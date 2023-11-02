import markdown from "./transforms/markdown.ts";

// init({ routes }: { routes: Routes })
function init() {
  async function processMarkdown(
    filename: string,
    { skipFirstLine }: { skipFirstLine: boolean },
  ) {
    const lines = await Deno.readTextFile(filename);

    return markdown(
      skipFirstLine ? lines.split("\n").slice(1).join("\n") : lines,
    );
  }

  // Globally available utilities should be exposed here
  return { processMarkdown };
}

export { init };
