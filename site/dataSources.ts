import { parse } from "https://deno.land/x/frontmatter@v0.1.4/mod.ts";
import markdown from "./transforms/markdown.ts";
import { dir } from "../utilities/fs.ts";
import type { MarkdownWithFrontmatter } from "../types.ts";

async function processMarkdown(filename: string) {
  return markdown(await Deno.readTextFile(filename));
}

async function parseHeadmatter(filename: string) {
  return parse(await Deno.readTextFile(filename));
}

async function indexMarkdown(directory: string) {
  const files = await dir({ path: directory, extension: ".md" });

  return Promise.all(
    files.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as MarkdownWithFrontmatter)
    ),
  );
}

export { indexMarkdown, parseHeadmatter, processMarkdown };
