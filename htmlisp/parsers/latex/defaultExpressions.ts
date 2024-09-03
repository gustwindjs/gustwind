import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { parseDefinitionItem } from "./parsers/definition_item.ts";
import { parseListItem } from "./parsers/list_item.ts";
import type { Element } from "../../types.ts";

const singles: Record<string, SingleParser<Element>> = {
  // Url
  url: (children) => element("a", children, { href: children[0] }),
  // Titles
  chapter: el("h1"),
  section: el("h2"),
  subsection: el("h3"),
  subsubsection: el("h4"),
  paragraph: el("b"),
  // Formatting
  texttt: el("code"),
  textbf: el("b"),
  textit: el("i"),
};

const doubles: Record<string, DoubleParser<Element>> = {
  // Url
  "href": (href: string, children?: string) =>
    element("a", [children || ""], href ? { href } : {}),
};

const blocks: Record<string, BlockParser<Element, string>> = {
  "verbatim": {
    container: (children) => element("pre", children),
    item: (g) => getParseContent<string>((s) => s.join(""))(g).value,
  },
  "quote": {
    container: (children) => element("blockquote", children),
    item: (g) => getParseContent<string>((s) => s.join(""))(g).value,
  },
};

const lists: Record<string, BlockParser<Element, Element>> = {
  "enumerate": {
    container: (children) => element("ol", children),
    item: (g) => element("li", [parseListItem(g).value]),
  },
  "itemize": {
    container: (children) => element("ul", children),
    item: (g) => element("li", [parseListItem(g).value]),
  },
  "description": {
    container: (children) => element("dl", children),
    item: (g) => {
      const { title, description } = parseDefinitionItem(g).value;

      return element("", [
        element("dt", [title]),
        element("dd", [description]),
      ]);
    },
  },
};

const cites: Record<string, SingleParser<Element>> = {
  footnote: (children, matchCounts) => ({
    type: "sup",
    attributes: { title: children[0] },
    children: [
      (matchCounts.footnote
        ? matchCounts.footnote.findIndex((e) => e === children[0])
        : 0)
        .toString(),
    ],
  }),
  // TODO: Add reference through bibtex
  cite: (children, matchCounts) => ({
    type: "span",
    attributes: { title: children[0] },
    children: [
      "[" +
      (matchCounts.cite
        ? matchCounts.cite.findIndex((e) => e === children[0])
        : 0)
        .toString() +
      "]",
    ],
  }),
  // TODO: Textual citation (needs a bibtex lookup)
  citet: (children, matchCounts) => ({
    type: "span",
    attributes: { title: children[0] },
    children: [
      (matchCounts.citet
        ? matchCounts.citet.findIndex((e) => e === children[0])
        : 0)
        .toString(),
    ],
  }),
  // TODO: Textual citation in parentheses (needs a bibtex lookup)
  citep: (children, matchCounts) => ({
    type: "span",
    attributes: { title: children[0] },
    children: [
      "(" +
      (matchCounts.citep
        ? matchCounts.citep.findIndex((e) => e === children[0])
        : 0)
        .toString() +
      ")",
    ],
  }),
  // TODO: Write reference using bibtex
  fullcite: (children) => ({
    type: "span",
    attributes: { title: children[0] },
    children: ["full cite goes here"],
  }),
};

function el(type: string) {
  return function e(children: string[]) {
    return element(type, children);
  };
}

function element(
  type: string,
  children: (Element | string)[],
  attributes?: Record<string, string>,
): Element {
  return {
    type,
    attributes: attributes || {},
    children,
  };
}

export { blocks, cites, doubles, el, element, lists, singles };
