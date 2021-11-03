import { twind } from "../browserDeps.ts";
import {
  highlight,
  highlightJS,
  highlightJSON,
  highlightTS,
  marked,
} from "../deps.ts";

highlight.registerLanguage("javascript", highlightJS);
highlight.registerLanguage("js", highlightJS);
highlight.registerLanguage("json", highlightJSON);
highlight.registerLanguage("typescript", highlightTS);
highlight.registerLanguage("ts", highlightTS);

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  highlight: (code, language) => {
    return highlight.highlight(code, { language }).value;
  },
});

function transformMarkdown(input: string) {
  // https://github.com/markedjs/marked/issues/545
  const tableOfContents: { slug: string; level: number; text: string }[] = [];

  // https://marked.js.org/using_pro#renderer
  // https://github.com/markedjs/marked/blob/master/src/Renderer.js
  marked.use({
    renderer: {
      code(code, infostring) {
        const lang = (infostring || "").match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            code = out;
          }
        }

        code = code.replace(/\n$/, "") + "\n";

        if (!lang) {
          return "<pre><code>" +
            code +
            "</code></pre>\n";
        }

        return '<pre class="' + twind.tw`overflow-auto` + '"><code class="' +
          this.options.langPrefix +
          lang +
          '">' +
          code +
          "</code></pre>\n";
      },
      heading(text, level, raw, slugger) {
        const slug = slugger.slug(raw);

        tableOfContents.push({ slug, level, text });

        return '<a href="#' + slug + '"><h' +
          level +
          ' class="' + twind.tw`inline` + '"' +
          ' id="' +
          slug +
          '">' +
          text +
          "</h" +
          level +
          ">" +
          "</a>\n";
      },
      link(href, title, text) {
        if (href === null) {
          return text;
        }
        let out = '<a class="' + twind.tw`underline` + '" href="' + href + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      },
      list(body, ordered, start) {
        const type = ordered ? "ol" : "ul",
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : "",
          klass = ordered
            ? "list-decimal list-inside"
            : "list-disc list-inside";
        return "<" + type + startatt + ' class="' + twind.tw(klass) + '">\n' +
          body +
          "</" +
          type + ">\n";
      },
    },
  });

  return { content: marked(input), tableOfContents };
}

export default transformMarkdown;
