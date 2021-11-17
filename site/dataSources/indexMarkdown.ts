import { parse } from "https://deno.land/x/frontmatter/mod.ts";
import { dir } from "../../utils/fs.ts";
import type { MarkdownWithFrontmatter } from "../../types.ts";

async function indexMarkdown(directory: string) {
  const files = await dir(directory, ".md");

  return Promise.all(
    files.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as MarkdownWithFrontmatter)
    ),
  );
}

export default indexMarkdown;
