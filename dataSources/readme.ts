import { Marked, Renderer } from "markdown";

Marked.setOptions({
  renderer: new Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
});

async function getReadme() {
  const readmeContent = await Deno.readTextFile("./README.md");

  return Marked.parse(readmeContent);
}

export default getReadme;
