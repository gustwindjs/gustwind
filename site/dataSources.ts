import {
  extract,
  test,
} from "https://deno.land/std@0.207.0/front_matter/yaml.ts";
import { parse } from "https://deno.land/std@0.207.0/yaml/parse.ts";
import getMarkdown from "./transforms/markdown.ts";
import { getMemo } from "../utilities/getMemo.ts";
import type { DataSourcesApi } from "../types.ts";

type MarkdownWithFrontmatter = {
  data: {
    slug: string;
    title: string;
    date: Date;
    keywords: string[];
  };
  content: string;
};

function init({ load, render, renderSync }: DataSourcesApi) {
  const markdown = getMarkdown({ load, render, renderSync });

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
    { path }: { path: string },
    o?: { parseHeadmatter: boolean; skipFirstLine: boolean },
  ) {
    if (o?.parseHeadmatter) {
      const headmatter = await parseHeadmatter(path);

      return { ...headmatter, ...(await parseMarkdown(headmatter.content)) };
    }

    // Markdown also parses toc but it's not needed for now
    return parseMarkdown(await load.textFile(path), o);
  }

  async function parseHeadmatter(
    path: string,
  ): Promise<MarkdownWithFrontmatter> {
    const file = await load.textFile(path);

    if (test(file)) {
      const { frontMatter, body: content } = extract(file);

      return {
        // TODO: It would be better to handle this with Zod or some other runtime checker
        data: parse(frontMatter) as MarkdownWithFrontmatter["data"],
        content,
      };
    }

    throw new Error(`path ${path} did not contain a headmatter`);
  }

  // Interestingly enough caching to fs doesn't result in a speedup
  // TODO: Investigate why not
  // const fs = await fsCache(path.join(Deno.cwd(), ".gustwind"));
  const memo = getMemo(new Map());
  function parseMarkdown(lines: string, o?: { skipFirstLine: boolean }) {
    const input = o?.skipFirstLine
      ? lines.split("\n").slice(1).join("\n")
      : lines;

    return memo(markdown, input);
  }

  return { indexMarkdown, processMarkdown };
}

export { init };
