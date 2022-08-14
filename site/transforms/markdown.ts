import { marked } from "https://unpkg.com/@bebraw/marked@4.0.19/lib/marked.esm.js";
import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { getDefinitions } from "../../utils/getDefinitions.ts";
import { renderHTML } from "../../utils/renderPage.ts";
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

function transformMarkdown(input: string) {
  if (typeof input !== "string") {
    throw new Error("transformMarkdown - passed wrong type of input");
  }

  // https://github.com/markedjs/marked/issues/545
  const tableOfContents: { slug: string; level: number; text: string }[] = [];

  marked.use({
    async: true,
    extensions: [{
      name: "importComponent",
      level: "block",
      start(src: string) {
        return src.indexOf(":");
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
          const html = await renderHTML({
            component: matchedComponent,
            components: {},
            context: {},
            utilities: pageUtilities,
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

  return { content: marked(input), tableOfContents };
}

export default transformMarkdown;
