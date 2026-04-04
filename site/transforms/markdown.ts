import { marked } from "marked";
import type { RendererObject, Tokens } from "marked";
import type { DataSourcesApi } from "../../types.ts";
import highlight from "highlight.js/lib/core";
import highlightBash from "highlight.js/lib/languages/bash";
import highlightJS from "highlight.js/lib/languages/javascript";
import highlightJSON from "highlight.js/lib/languages/json";
import highlightTS from "highlight.js/lib/languages/typescript";
import highlightXML from "highlight.js/lib/languages/xml";
import highlightYAML from "highlight.js/lib/languages/yaml";
import { isRawHtml } from "../../htmlisp/utilities/runtime.ts";

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
});

function getTransformMarkdown({ load, renderSync }: DataSourcesApi) {
  return async function transformMarkdown(input: unknown) {
    const markdownInput = isRawHtml(input) ? input.value : input;

    if (typeof markdownInput !== "string") {
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

    const renderer: RendererObject<string, string> = {
      code(token: Tokens.Code): string {
        let code = token.text;
        const lang = token.lang;

        if (lang && highlight.getLanguage(lang)) {
          code = highlight.highlight(code, { language: lang }).value;
        }

        return renderCodeBlock({
          code,
          lang,
          // @ts-expect-error Marked keeps renderer options on `this`
          langPrefix: this.options.langPrefix || "",
        });
      },
      heading(token: Tokens.Heading): string {
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
          "ml-2 no-underline text-sm align-middle mask-text" +
          '" href="#' +
          slug +
          '">🔗</a>\n' +
          "</h" +
          level +
          ">\n";
      },
      link(token: Tokens.Link): string | false {
        const text = this.parser.parseInline(token.tokens);

        if (token.href === null) {
          return text;
        }

        if (text === "<file>") {
          // TODO: Show a nice error in case href is not found in the fs
          const fileContents = load.textFileSync(token.href);

          return renderCodeBlock({
            code: fileContents,
            lang: token.href.split(".").at(-1),
            // @ts-expect-error Marked keeps renderer options on `this`
            langPrefix: this.options.langPrefix || "",
          });
        }

        let out = '<a class="underline" href="' + token.href + '"';
        if (token.title) {
          out += ' title="' + token.title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      },
      list(token: Tokens.List): string {
        // Copied from marked source
        let body = "";
        for (let j = 0; j < token.items.length; j++) {
          const item = token.items[j];

          body += this.listitem(item);
        }

        const type = token.ordered ? "ol" : "ul",
          startatt = (token.ordered && token.start !== 1)
            ? (' start="' + token.start + '"')
            : "",
          klass = token.ordered
            ? "list-decimal list-inside"
            : "list-disc list-inside";
        return "<" + type + startatt + ' class="' + klass + '">\n' +
          body +
          "</" +
          type + ">\n";
      },
    };

    // https://marked.js.org/using_pro#renderer
    // https://github.com/markedjs/marked/blob/master/src/Renderer.js
    marked.use({ renderer });

    return { content: await marked(markdownInput), tableOfContents };
  };
}

function renderCodeBlock(
  { code, lang, langPrefix }: {
    code: string;
    lang?: string;
    langPrefix: string;
  },
) {
  const normalizedCode = code.replace(/\n$/, "") + "\n";

  if (!lang) {
    return "<pre><code>" +
      normalizedCode +
      "</code></pre>\n";
  }

  return '<pre class="overflow-auto -mx-4 md:mx-0"><code class="' +
    langPrefix +
    lang +
    '">' +
    normalizedCode +
    "</code></pre>\n";
}

function slugify(idBase: string) {
  return idBase
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-");
}

export default getTransformMarkdown;
