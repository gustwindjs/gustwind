import { parse } from "https://deno.land/x/frontmatter@v0.1.4/mod.ts";
import markdown from "./transforms/markdown.ts";
import { dir } from "../utils/fs.ts";
import type { MarkdownWithFrontmatter } from "../types.ts";

function blogPosts() {
  return indexMarkdown("./blogPosts");
}

function documentation() {
  return indexMarkdown("./documentation");
}

async function readme() {
  return markdown(await Deno.readTextFile("./README.md"));
}

async function parseHeadmatter() {
  return parse(await Deno.readTextFile("./breezewind/README.md"));
}

async function indexMarkdown(directory: string) {
  const files = await dir(directory, ".md");

  return Promise.all(
    files.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as MarkdownWithFrontmatter)
    ),
  );
}

export { blogPosts, documentation, parseHeadmatter, readme };
