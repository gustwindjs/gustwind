import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { parseDefinitionItem } from "./parsers/definition_item.ts";
import { parseListItem } from "./parsers/list_item.ts";
import type { Element } from "../../types.ts";
import { cites } from "./citations.ts";
import { el, element } from "./elements.ts";
import { refs } from "./references.ts";

type LatexNode = Element | string;

const singles: Record<string, SingleParser<LatexNode>> = {
  // Url
  url: (children) => element("a", children, { href: children[0] }),
  // Titles
  chapter: el("h1"),
  section: el("h2"),
  subsection: el("h3"),
  subsubsection: el("h4"),
  paragraph: el("b"),
  label: () => element("", []),
  newline: () => " ",
  textbackslash: () => "\\",
  // Formatting
  texttt: el("code"),
  textbf: el("b"),
  textit: el("i"),
};

const doubles: Record<string, DoubleParser<Element>> = {
  // Url
  href: (href: string, children?: string) =>
    element("a", [children || ""], href ? { href } : {}),
};

const blocks: Record<string, BlockParser<Element, string>> = {
  verbatim: {
    container: (children) => element("pre", children),
    item: getParseContent<string>((s) => s.join("")),
  },
  quote: {
    container: (children) => element("blockquote", children),
    item: getParseContent<string>((s) => s.join("")),
  },
};

const lists: Record<string, BlockParser<Element, Element>> = {
  enumerate: {
    container: (children) => element("ol", children),
    item: (g) => element("li", [parseListItem(g)]),
  },
  itemize: {
    container: (children) => element("ul", children),
    item: (g) => element("li", [parseListItem(g)]),
  },
  description: {
    container: (children) => element("dl", children),
    item: (g) => {
      const { title, description } = parseDefinitionItem(g);

      return element("", [
        element("dt", [title]),
        element("dd", [description]),
      ]);
    },
  },
};

export { blocks, cites, doubles, el, element, lists, refs, singles };
