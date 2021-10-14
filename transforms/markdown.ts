import marked from "markdown";
// import hljs from "highlight";
import { tw } from "twind";

/*
import javascript from "highlight-js";
import json from "highlight-json";
import typescript from "highlight-ts";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
*/

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  /*highlight: (code, language) => {
    return hljs.highlight(code, { language }).value;
  },*/
});

// https://marked.js.org/using_pro#renderer
// https://github.com/markedjs/marked/blob/master/src/Renderer.js
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

      return '<pre class="' + tw`overflow-auto` + '"><code class="' +
        this.options.langPrefix +
        lang +
        '">' +
        code +
        "</code></pre>\n";
    },
    link(href, title, text) {
      if (href === null) {
        return text;
      }
      let out = '<a class="' + tw`underline` + '" href="' + href + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += ">" + text + "</a>";
      return out;
    },
    list(body, ordered, start) {
      const type = ordered ? "ol" : "ul",
        startatt = (ordered && start !== 1) ? (' start="' + start + '"') : "",
        klass = ordered ? "list-decimal list-inside" : "list-disc list-inside";
      return "<" + type + startatt + ' class="' + tw(klass) + '">\n' + body +
        "</" +
        type + ">\n";
    },
  },
});

function transformMarkdown(input: string) {
  return { content: marked(input) };
}

export default transformMarkdown;
