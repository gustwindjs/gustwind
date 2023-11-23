import {
  extract,
  test,
} from "https://deno.land/std@0.207.0/front_matter/yaml.ts";
import { parse } from "https://deno.land/std@0.207.0/yaml/parse.ts";
import getMarkdown from "./transforms/markdown.ts";
import type { LoadApi } from "../types.ts";

type MarkdownWithFrontmatter = {
  data: {
    slug: string;
    title: string;
    date: Date;
    keywords: string[];
  };
  content: string;
};

function init({ load }: { load: LoadApi }) {
  const markdown = getMarkdown(load);

  async function indexMarkdown(
    directory: string,
  ) {
    const files = await load.dir({
      path: directory,
      extension: ".md",
      type: "",
    });

    return Promise.all(
      files.map(async ({ path }) => ({ ...await parseHeadmatter(path), path })),
    );
  }

  async function processMarkdown(
    filename: string,
    o?: { parseHeadmatter: boolean; skipFirstLine: boolean },
  ) {
    if (o?.parseHeadmatter) {
      const headmatter = await parseHeadmatter(filename);

      return { ...headmatter, ...(await parseMarkdown(headmatter.content)) };
    }

    // Markdown also parses toc but it's not needed for now
    return parseMarkdown(await load.textFile(filename), o);
  }

  async function parseHeadmatter(
    path: string,
  ): Promise<MarkdownWithFrontmatter> {
    const file = await load.textFile(path);

    if (test(file)) {
      const { frontMatter, body: content } = extract(file);

      return {
        // @ts-expect-error Chck how to type data properly.
        // Maybe some form of runtime check would be good.
        data: parse(frontMatter),
        content,
      };
    }

    throw new Error(`path ${path} did not contain a headmatter`);
  }

  function parseMarkdown(lines: string, o?: { skipFirstLine: boolean }) {
    return markdown(
      o?.skipFirstLine ? lines.split("\n").slice(1).join("\n") : lines,
    );
  }

  return { indexMarkdown, processMarkdown };
}

export { init };
