import { parse } from "frontmatter";
import { dir } from "../src/utils.ts";
import type { BlogPost } from "../types.ts";

async function indexBlog(directory: string) {
  const blogFiles = await dir(directory, ".md");
  const blogPosts: BlogPost[] = await Promise.all(
    blogFiles.map(({ path }) =>
      Deno.readTextFile(path).then((d) => parse(d) as BlogPost)
    ),
  );

  return blogPosts.map(({ data }) => data);
}

export default indexBlog;
