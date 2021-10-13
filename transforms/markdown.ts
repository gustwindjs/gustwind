import marked from "markdown";
import hljs from "highlight";

import javascript from "highlight-js";
import json from "highlight-json";
import typescript from "highlight-ts";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  highlight: (code, language) => {
    return hljs.highlight(code, { language }).value;
  },
});

function transformMarkdown(input: string) {
  return { content: marked(input) };
}

export default transformMarkdown;
