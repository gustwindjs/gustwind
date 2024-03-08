import { install, tw } from "https://esm.sh/@twind/core@1.1.1";
import { marked } from "https://unpkg.com/marked@9.1.5/lib/marked.esm.js";
import { renderComponent } from "../../gustwind-utilities/renderComponent.ts";
import { dir } from "../../utilities/fs.ts";
import type { LoadApi } from "../../types.ts";
import { initLoader } from "../../utilities/htmlLoader.ts";
import * as globalUtilities from "../globalUtilities.ts";
import {
  getComponentUtilities,
} from "../../gustwind-utilities/getUtilities.ts";
import highlight from "https://unpkg.com/@highlightjs/cdn-assets@11.9.0/es/core.min.js";
import highlightBash from "https://unpkg.com/highlight.js@11.9.0/es/languages/bash.js";
import highlightJS from "https://unpkg.com/highlight.js@11.9.0/es/languages/javascript.js";
import highlightJSON from "https://unpkg.com/highlight.js@11.9.0/es/languages/json.js";
import highlightTS from "https://unpkg.com/highlight.js@11.9.0/es/languages/typescript.js";
import highlightXML from "https://unpkg.com/highlight.js@11.9.0/es/languages/xml.js";
import highlightYAML from "https://unpkg.com/highlight.js@11.9.0/es/languages/yaml.js";
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

const htmlLoader = initLoader({
  cwd: Deno.cwd(),
  loadDir: dir,
  loadModule: (path) => import(path),
});

function getTransformMarkdown(load: LoadApi) {
  return async function transformMarkdown(input: string) {
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
          const { components, componentUtilities } = await htmlLoader(
            "./site/components",
          );
          const matchedComponent = components[token.component];

          if (matchedComponent) {
            token.html = await renderComponent({
              component: matchedComponent,
              components,
              globalUtilities: globalUtilities.init(),
              componentUtilities: getComponentUtilities({
                componentUtilities,
                routes: {},
              }),
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
        code(code: string, lang: string): string {
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
        ) {
          const slug = slugify(raw);

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
            const fileContents = load.textFileSync(href);

            return this.code(fileContents, href.split(".").at(-1) as string);
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
            startatt = (ordered && start !== 1)
              ? (' start="' + start + '"')
              : "",
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
  };
}

function slugify(idBase: string) {
  return idBase
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-");
}

export default getTransformMarkdown;
