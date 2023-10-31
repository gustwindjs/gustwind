import { parse } from "https://deno.land/x/frontmatter@v0.1.4/mod.ts";
import markdown from "./transforms/markdown.ts";
import { dir } from "../utilities/fs.ts";

type MarkdownWithFrontmatter = {
  data: {
    slug: string;
    title: string;
    date: Date;
    keywords: string[];
  };
  content: string;
};

async function processMarkdown(
  filename: string,
  { skipFirstLine }: { skipFirstLine: boolean },
) {
  const lines = await Deno.readTextFile(filename);

  return markdown(
    skipFirstLine ? lines.split("\n").slice(1).join("\n") : lines,
  );
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
