import { install, tw } from "https://esm.sh/@twind/core@1.1.1";
import { marked } from "https://unpkg.com/marked@15.0.3/lib/marked.esm.js";
import type { Renderer } from "https://unpkg.com/marked@15.0.3/lib/marked.d.ts";
import type { DataSourcesApi } from "../../types.ts";
import highlight from "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/es/core.min.js";
import highlightBash from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/bash.js";
import highlightJS from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/javascript.js";
import highlightJSON from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/json.js";
import highlightTS from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/typescript.js";
import highlightXML from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/xml.js";
import highlightYAML from "https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/es/languages/yaml.js";
import twindSetup from "../twindSetup.ts";

highlight.registerLanguage("bash", highlightBash);
highlight.registerLanguage("html", highlightXML);
highlight.registerLanguage("javascript", highlightJS);
highlight.registerLanguage("js", highlightJS);
highlight.registerLanguage("json", highlightJSON);
highlight.registerLanguage("typescript", highlightTS);
highlight.registerLanguage("ts", highlightTS);
highlight.registerLanguage("xml", highlightXML);
highlight.registerLanguage("toml", highlightYAML);
highlight.registerLanguage("yaml", highlightYAML);

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  highlight: (code: string, language: string) => {
    return highlight.highlight(code, { language }).value;
  },
});

// @ts-expect-error This is fine
install(twindSetup);

function getTransformMarkdown({ load, renderSync }: DataSourcesApi) {
  return async function transformMarkdown(input: string) {
    if (typeof input !== "string") {
      console.error("input", input);
      throw new Error("transformMarkdown - passed wrong type of input");
    }

    // https://github.com/markedjs/marked/issues/545
    const tableOfContents: { slug: string; level: number; text: string }[] = [];

    // If you want to use async rendering here, set `async: true` at `marked.use`
    // and use regular render() instead. In that case walktTokens has to be
    // set `async walkTokens`.
    marked.use({
      extensions: [{
        name: "importComponent",
        level: "block",
        // Avoid consuming too much
        start(src: string) {
          return src.indexOf("\n:");
        },
        tokenizer(src: string) {
          const rule = /^\:([A-Za-z]+)\:/;
          const match = rule.exec(src);

          if (match) {
            return {
              type: "importComponent",
              raw: match[0],
              component: match[1],
              html: "", // will be replaced in walkTokens
            };
          }
        },
        // @ts-ignore How to type this?
        renderer(token) {
          return token.html;
        },
      }],
      // @ts-ignore How to type this?
      walkTokens(token) {
        if (token.type === "importComponent") {
          token.html = renderSync({ componentName: token.component });
        }
      },
    });

    const renderer: Pick<
      Renderer,
      "code" | "heading" | "link" | "list"
    > = {
      code({ text: code, lang }) {
        // @ts-ignore How to type this?
        if (this.options.highlight) {
          // TODO: Inject highlight.js now through `load.style`
          // This should replace BaseLayout bits that currently exist.
          // Furthermore, injection should be unique.
          // Likely style should be exposed as markdown parameter so it
          // is easy to change.

          // @ts-ignore How to type this?
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

        return '<pre class="' +
          tw("overflow-auto -mx-4 md:mx-0") +
          '"><code class="' +
          // @ts-ignore How to type this?
          (this.options.langPrefix || "") +
          lang +
          '">' +
          code +
          "</code></pre>\n";
      },
      heading(token) {
        // @ts-expect-error Parser will exist
        const text = this.parser.parseInline(token.tokens);
        const level = token.depth;
        const slug = slugify(token.raw);

        tableOfContents.push({ slug, level, text });

        return "<h" +
          level +
          ' id="' +
          slug +
          '">' +
          text +
          '<a class="' +
          tw("ml-2 no-underline text-sm align-middle mask-text") +
          '" href="#' +
          slug +
          '">🔗</a>\n' +
          "</h" +
          level +
          ">\n";
      },
      link({ href, title, tokens }) {
        // @ts-expect-error Parser will exist
        const text = this.parser.parseInline(tokens);

        if (href === null) {
          return text;
        }

        if (text === "<file>") {
          // TODO: Show a nice error in case href is not found in the fs
          const fileContents = load.textFileSync(href);

          return this.code({
            type: "code",
            text: fileContents,
            lang: href.split(".").at(-1) as string,
            raw: fileContents,
          });
        }

        let out = '<a class="' + tw("underline") + '" href="' + href + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      },
      list({ ordered, start, items }) {
        // Copied from marked source
        let body = "";
        for (let j = 0; j < items.length; j++) {
          const item = items[j];

          // @ts-expect-error Use default listitem
          body += this.listitem(item);
        }

        const type = ordered ? "ol" : "ul",
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : "",
          klass = ordered
            ? "list-decimal list-inside"
            : "list-disc list-inside";
        return "<" + type + startatt + ' class="' + tw(klass) + '">\n' +
          body +
          "</" +
          type + ">\n";
      },
    };

    // https://marked.js.org/using_pro#renderer
    // https://github.com/markedjs/marked/blob/master/src/Renderer.js
    marked.use({ renderer });

    return { content: await marked(input), tableOfContents };
  };
}

function slugify(idBase: string) {
  return idBase
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-");
}

export default getTransformMarkdown;
