import { parse } from "frontmatter";
import { dir } from "../src/utils.ts";
import type { BlogPost } from "../types.ts";

async function indexBlog(directory: string) {
  const blogFiles = await dir(directory, ".md");

  return Promise.all(
    blogFiles.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as BlogPost)
    ),
  );
}

export default indexBlog;
