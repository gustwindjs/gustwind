import { marked } from "https://unpkg.com/@bebraw/marked@4.0.19/lib/marked.esm.js";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import { plugin } from "../../renderers/breezewind/mod.ts";
import type { Component } from "../../breezewind/types.ts";
import * as pageUtilities from "../pageUtilities.ts";
import highlight from "https://unpkg.com/@highlightjs/cdn-assets@11.3.1/es/core.min.js";
import highlightBash from "https://unpkg.com/highlight.js@11.3.1/es/languages/bash";
import highlightJS from "https://unpkg.com/highlight.js@11.3.1/es/languages/javascript";
import highlightJSON from "https://unpkg.com/highlight.js@11.3.1/es/languages/json";
import highlightTS from "https://unpkg.com/highlight.js@11.3.1/es/languages/typescript";
import highlightYAML from "https://unpkg.com/highlight.js@11.3.1/es/languages/yaml";

highlight.registerLanguage("bash", highlightBash);
highlight.registerLanguage("javascript", highlightJS);
highlight.registerLanguage("js", highlightJS);
highlight.registerLanguage("json", highlightJSON);
highlight.registerLanguage("typescript", highlightTS);
highlight.registerLanguage("ts", highlightTS);
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

// TODO: This dependency on twind is nasty as has an implicit dependency on
// plugins/twind/mod.ts setup
const tw = pageUtilities.tw;

// TODO: Restore this one, figure out how to deal with the paths
// const renderHTML =
//  (await plugin({ componentsPath: "", layoutsPath: "" })).render;
const renderHTML = () => "";

async function transformMarkdown(input: string) {
  if (typeof input !== "string") {
    console.error("input", input);
    throw new Error("transformMarkdown - passed wrong type of input");
  }

  // https://github.com/markedjs/marked/issues/545
  const tableOfContents: { slug: string; level: number; text: string }[] = [];

  marked.use({
    async: true,
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
    async walkTokens(token) {
      if (token.type === "importComponent") {
        const components = await getDefinitions<Component>("./site/components");
        const matchedComponent = components[token.component];

        if (matchedComponent) {
          // TODO: Restore this by getting reference to the current renderer
          // here and then using it
          /* const html = await renderHTML({
            component: matchedComponent,
            components: {},
            context: {},
            utilities: pageUtilities,
          }); */
          // const html = "";
          const html = await renderHTML({
            layout: matchedComponent,
            components: {},
            context: {},
          });

          token.html = html;
        } else {
          throw new Error(
            `Failed to find a matching component for ${token.component}`,
          );
        }
      }
    },
  });

  // https://marked.js.org/using_pro#renderer
  // https://github.com/markedjs/marked/blob/master/src/Renderer.js
  marked.use({
    renderer: {
      code(code: string, infostring: string): string {
        const lang = ((infostring || "").match(/\S*/) || [])[0];
        // @ts-ignore How to type this?
        if (this.options.highlight) {
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
          tw`overflow-auto -mx-4 md:mx-0 bg-gray-100` +
          '"><code class="' +
          // @ts-ignore How to type this?
          this.options.langPrefix +
          lang +
          '">' +
          code +
          "</code></pre>\n";
      },
      heading(
        text: string,
        level: number,
        raw: string,
        slugger: { slug: (s: string) => string },
      ) {
        const slug = slugger.slug(raw);

        tableOfContents.push({ slug, level, text });

        return '<a href="#' + slug + '"><h' +
          level +
          ' class="' + tw`inline` + '"' +
          ' id="' +
          slug +
          '">' +
          text +
          "</h" +
          level +
          ">" +
          "</a>\n";
      },
      link(href: string, title: string, text: string) {
        if (href === null) {
          return text;
        }

        if (text === "<file>") {
          return this.code(Deno.readTextFileSync(href), href.split(".")[1]);
        }

        let out = '<a class="' + tw`underline` + '" href="' + href + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += ">" + text + "</a>";
        return out;
      },
      list(body: string, ordered: string, start: number) {
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
    },
  });

  return { content: await marked(input), tableOfContents };
}

export default transformMarkdown;
