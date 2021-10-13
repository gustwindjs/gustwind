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

function transformMarkdown(input: string) {
  return Marked.parse(input).content;
}

export default transformMarkdown;
