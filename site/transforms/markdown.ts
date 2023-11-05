import { install, tw } from "https://esm.sh/@twind/core@1.1.1";
import { marked } from "https://unpkg.com/@bebraw/marked@4.0.19/lib/marked.esm.js";
import { renderHTML } from "../../plugins/breezewind-renderer/mod.ts";
import { dir } from "../../utilities/fs.ts";
import { initLoaders } from "../../utilities/loaders.ts";
import {
  getComponentUtilities,
  getGlobalUtilities,
} from "../../gustwind-utilities/getUtilities.ts";
import * as globalUtilities from "../globalUtilities.ts";
import highlight from "https://unpkg.com/@highlightjs/cdn-assets@11.3.1/es/core.min.js";
import highlightBash from "https://unpkg.com/highlight.js@11.3.1/es/languages/bash.js";
import highlightJS from "https://unpkg.com/highlight.js@11.3.1/es/languages/javascript.js";
import highlightJSON from "https://unpkg.com/highlight.js@11.3.1/es/languages/json.js";
import highlightTS from "https://unpkg.com/highlight.js@11.3.1/es/languages/typescript.js";
import highlightXML from "https://unpkg.com/highlight.js@11.3.1/es/languages/xml.js";
import highlightYAML from "https://unpkg.com/highlight.js@11.3.1/es/languages/yaml.js";
import twindSetup from "../twindSetup.ts";

highlight.registerLanguage("bash", highlightBash);
highlight.registerLanguage("html", highlightXML);
highlight.registerLanguage("javascript", highlightJS);
highlight.registerLanguage("js", highlightJS);
highlight.registerLanguage("json", highlightJSON);
highlight.registerLanguage("typescript", highlightTS);
highlight.registerLanguage("ts", highlightTS);
highlight.registerLanguage("xml", highlightXML);
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

const loaders = initLoaders({
  cwd: Deno.cwd(),
  loadDir: dir,
  loadModule: (path) => import(path),
});

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
        // TODO: This is a bad coupling, there should be a better way to get information here
        // especially if this file will be executed in the browser
        const components = await loaders.html("./site/components");
        const matchedComponent = components[token.component];

        if (matchedComponent) {
          token.html = await renderHTML({
            component: matchedComponent.component,
            components: {},
            globalUtilities: getGlobalUtilities(
              globalUtilities,
              components,
              {},
              "",
            ),
            componentUtilities: getComponentUtilities(components, {}),
          });
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
          tw("overflow-auto -mx-4 md:mx-0") +
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
      link(href: string, title: string, text: string) {
        if (href === null) {
          return text;
        }

        if (text === "<file>") {
          // TODO: Show a nice error in case href is not found in the fs
          return this.code(Deno.readTextFileSync(href), href.split(".")[1]);
        }

        let out = '<a class="' + tw("underline") + '" href="' + href + '"';
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
