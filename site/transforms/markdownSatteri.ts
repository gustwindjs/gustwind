import {
  defineHastPlugin,
  defineMdastPlugin,
  markdownToHtml,
} from "satteri";
import type { HastPluginInput, MdastPluginInput } from "satteri";
import type { Heading, Link, Paragraph, Text } from "mdast";
import type { Element, RootContent } from "hast";
import type { DataSourcesApi } from "../../types.ts";
import highlight from "highlight.js/lib/core";
import highlightBash from "highlight.js/lib/languages/bash";
import highlightJS from "highlight.js/lib/languages/javascript";
import highlightJSON from "highlight.js/lib/languages/json";
import highlightTS from "highlight.js/lib/languages/typescript";
import highlightXML from "highlight.js/lib/languages/xml";
import highlightYAML from "highlight.js/lib/languages/yaml";
import { isRawHtml } from "../../htmlisp/utilities/rawHtml.ts";
import { escapeHTML } from "./escapeHTML.ts";

type TableOfContentsEntry = { slug: string; level: number; text: string };
type HeadingAnchor = TableOfContentsEntry;

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

function getTransformMarkdownSatteri({ load, renderSync }: DataSourcesApi) {
  return async function transformMarkdownSatteri(input: unknown) {
    const markdownInput = isRawHtml(input) ? input.value : input;

    if (typeof markdownInput !== "string") {
      console.error("input", input);
      throw new Error("transformMarkdownSatteri - passed wrong type of input");
    }

    const tableOfContents: TableOfContentsEntry[] = [];
    const headingAnchors = tableOfContents;
    const data = { tableOfContents };
    const mdastPlugins: MdastPluginInput[] = [
      createGustwindMdastPlugin({ headingAnchors, load, renderSync }),
    ];
    const hastPlugins: HastPluginInput[] = [
      createGustwindHastPlugin({ headingAnchors }),
    ];
    const result = await markdownToHtml(markdownInput, {
      data,
      features: {
        gfm: true,
        frontmatter: false,
      },
      mdastPlugins,
      hastPlugins,
    });

    return { content: result.html, tableOfContents };
  };
}

function createGustwindMdastPlugin(
  { headingAnchors, load, renderSync }: Pick<DataSourcesApi, "load" | "renderSync"> & {
    headingAnchors: HeadingAnchor[];
  },
) {
  return defineMdastPlugin({
    name: "gustwind-markdown-mdast",
    heading(node: Readonly<Heading>, ctx) {
      const text = ctx.textContent(node);
      const raw = node.position?.start.offset !== undefined && node.position.end.offset !== undefined
        ? ctx.source.slice(node.position.start.offset, node.position.end.offset)
        : text;

      headingAnchors.push({
        slug: slugify(raw),
        level: node.depth,
        text,
      });
    },
    paragraph(node: Readonly<Paragraph>, ctx) {
      const componentName = getImportComponentName(node);

      if (componentName) {
        ctx.replaceNode(node, {
          rawHtml: renderSync({ componentName }),
        });
      }
    },
    link(node: Readonly<Link>, ctx) {
      if (ctx.textContent(node) !== "<file>") {
        return;
      }

      const fileContents = load.textFileSync(node.url);

      ctx.replaceNode(node, {
        rawHtml: renderCodeBlock({
          code: fileContents,
          lang: node.url.split(".").at(-1),
          langPrefix: "",
        }),
      });
    },
  });
}

function createGustwindHastPlugin(
  { headingAnchors }: { headingAnchors: HeadingAnchor[] },
) {
  let headingIndex = 0;

  return defineHastPlugin({
    name: "gustwind-markdown-hast",
    element: [
      {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        visit(node: Readonly<Element>, ctx) {
          const anchor = headingAnchors[headingIndex++];
          const slug = anchor?.slug ?? slugify(ctx.textContent(node));

          ctx.setProperty(node, "id", slug);
          ctx.appendChild(node, {
            type: "element",
            tagName: "a",
            properties: {
              class: "ml-2 no-underline text-sm align-middle mask-text",
              href: `#${slug}`,
            },
            children: [{ type: "text", value: "🔗" }],
          });
        },
      },
      {
        filter: ["a"],
        visit(node: Readonly<Element>, ctx) {
          ctx.setProperty(node, "class", "underline");
        },
      },
      {
        filter: ["ul"],
        visit(node: Readonly<Element>, ctx) {
          ctx.setProperty(node, "class", "list-disc list-inside");
        },
      },
      {
        filter: ["ol"],
        visit(node: Readonly<Element>, ctx) {
          ctx.setProperty(node, "class", "list-decimal list-inside");
        },
      },
      {
        filter: ["pre"],
        visit(node: Readonly<Element>, ctx) {
          const code = node.children.find(isCodeElement);

          if (!code) {
            return;
          }

          ctx.replaceNode(node, renderCodeElement({
            code: ctx.textContent(code),
            lang: getCodeLanguage(code),
            langPrefix: "",
          }));
        },
      },
    ],
  });
}

function getImportComponentName(node: Readonly<Paragraph>) {
  if (node.children.length !== 1) {
    return;
  }

  const [child] = node.children;

  if (!isTextNode(child)) {
    return;
  }

  const match = /^:([A-Za-z]+):$/.exec(child.value.trim());

  return match?.[1];
}

function isTextNode(node: Paragraph["children"][number]): node is Text {
  return node.type === "text";
}

function isCodeElement(node: RootContent): node is Element {
  return node.type === "element" && node.tagName === "code";
}

function getCodeLanguage(code: Readonly<Element>) {
  const className = code.properties?.className ?? code.properties?.class;
  const classes = Array.isArray(className) ? className : [className];
  const languageClass = classes.find((value): value is string =>
    typeof value === "string" && value.startsWith("language-")
  );

  return languageClass?.slice("language-".length);
}

function renderCodeElement(
  { code, lang, langPrefix }: {
    code: string;
    lang?: string;
    langPrefix: string;
  },
): Element {
  const normalizedLang = normalizeCodeLanguage(lang);

  return {
    type: "element",
    tagName: "pre",
    properties: { class: "overflow-auto -mx-4 md:mx-0" },
    children: [{
      type: "element",
      tagName: "code",
      properties: { class: langPrefix + normalizedLang },
      children: [{
        type: "raw",
        value: highlightCode({ code, normalizedLang }),
      }],
    }],
  };
}

function renderCodeBlock(
  { code, lang, langPrefix }: {
    code: string;
    lang?: string;
    langPrefix: string;
  },
) {
  const normalizedLang = normalizeCodeLanguage(lang);

  return '<pre class="overflow-auto -mx-4 md:mx-0"><code class="' +
    langPrefix +
    normalizedLang +
    '">' +
    highlightCode({ code, normalizedLang }) +
    "</code></pre>\n";
}

function normalizeCodeLanguage(lang?: string) {
  return lang && highlight.getLanguage(lang) ? lang : "plaintext";
}

function highlightCode(
  { code, normalizedLang }: { code: string; normalizedLang: string },
) {
  const renderedCode = normalizedLang !== "plaintext"
    ? highlight.highlight(code, { language: normalizedLang }).value
    : escapeHTML(code);

  return renderedCode.replace(/\n$/, "") + "\n";
}

function slugify(idBase: string) {
  return idBase
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-");
}

export default getTransformMarkdownSatteri;
