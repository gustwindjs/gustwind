import {
  extract,
  test,
} from "https://deno.land/std@0.205.0/front_matter/any.ts";
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

async function indexMarkdown(directory: string) {
  const files = await dir({ path: directory, extension: ".md" });

  return Promise.all(files.map(({ path }) => parseHeadmatter(path)));
}

async function parseHeadmatter(
  path: string,
): Promise<MarkdownWithFrontmatter> {
  const file = await Deno.readTextFile(path);

  if (test(file)) {
    const { frontMatter: data, body: content } = extract(file);

    // @ts-expect-error Chck how to type data properly.
    // Maybe some form of runtime check would be good.
    return { data, content };
  }

  throw new Error(`path ${path} did not contain a headmatter`);
}

export { indexMarkdown, parseHeadmatter, processMarkdown };
