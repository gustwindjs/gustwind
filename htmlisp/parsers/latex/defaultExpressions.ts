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
  // Footnote and citations
  // TODO: These need a different design due to numbering and markup requirements
  footnote: el("sup"),
  cite: el("sup"),
  citet: el("sup"),
  citep: el("sup"),
};

const doubles: Record<string, DoubleParser<Element>> = {
  // Url
  "href": (href: string, children?: string) =>
    element("a", [children || ""], href ? { href } : {}),
};

const blocks: Record<string, BlockParser<Element, Element>> = {
  // Url
  "verbatim": {
    container: (children) => element("pre", children),
    item: (g) => element("", [getParseContent<string>((s) => s.join(""))(g)]),
  },
  // Lists
  "enumerate": {
    container: (children) => element("ol", children),
    item: (g) => element("li", [parseListItem(g)]),
  },
  "itemize": {
    container: (children) => element("ul", children),
    item: (g) => element("li", [parseListItem(g)]),
  },
  "description": {
    container: (children) => element("dl", children),
    item: (g) => {
      const { title, description } = parseDefinitionItem(g);

      return element("dt", [title]), element("dd", [description]);
    },
  },
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

export { blocks, doubles, singles };
