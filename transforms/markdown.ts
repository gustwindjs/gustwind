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

marked.use({
  renderer: {
    code(code, infostring, escaped) {
      const lang = (infostring || "").match(/\S*/)[0];
      if (this.options.highlight) {
        const out = this.options.highlight(code, lang);
        if (out != null && out !== code) {
          escaped = true;
          code = out;
        }
      }

      code = code.replace(/\n$/, "") + "\n";

      if (!lang) {
        return "<pre><code>" +
          code +
          "</code></pre>\n";
      }

      return '<pre class="overflow-auto"><code class="' +
        this.options.langPrefix +
        lang +
        '">' +
        code +
        "</code></pre>\n";
    },
  },
});

function transformMarkdown(input: string) {
  return { content: marked(input) };
}

export default transformMarkdown;
