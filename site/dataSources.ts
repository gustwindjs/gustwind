import {
  extract,
  test,
} from "https://deno.land/std@0.205.0/front_matter/yaml.ts";
import { parse } from "https://deno.land/std@0.205.0/yaml/parse.ts";
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
    o?: { parseMarkdown: boolean },
  ) {
    const files = await load.dir({
      path: directory,
      extension: ".md",
      type: "",
    });

    return Promise.all(
      files.map(({ path }) => parseHeadmatter(path, o?.parseMarkdown)),
    );
  }

  // TODO: Change this so that Markdown is parsed lazily on demand per route!
  async function parseHeadmatter(
    path: string,
    parseMd?: boolean,
  ): Promise<MarkdownWithFrontmatter> {
    const file = await load.textFile(path);

    if (test(file)) {
      const { frontMatter, body: content } = extract(file);

      return {
        // @ts-expect-error Chck how to type data properly.
        // Maybe some form of runtime check would be good.
        data: parse(frontMatter),
        content: parseMd ? (await parseMarkdown(content)).content : content,
      };
    }

    throw new Error(`path ${path} did not contain a headmatter`);
  }

  async function processMarkdown(
    filename: string,
    o?: { skipFirstLine: boolean },
  ) {
    const lines = await load.textFile(filename);
    // Markdown also parses toc but it's not needed for now
    const { content } = await parseMarkdown(lines, o);

    return content;
  }

  function parseMarkdown(lines: string, o?: { skipFirstLine: boolean }) {
    return markdown(
      o?.skipFirstLine ? lines.split("\n").slice(1).join("\n") : lines,
    );
  }

  return { indexMarkdown, parseHeadmatter, processMarkdown };
}

export { init };
