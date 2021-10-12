import { Marked, Renderer } from "markdown";

// TODO: Set up highlighting
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
  return {
    content: "demo",
  };
}

export default getReadme;
