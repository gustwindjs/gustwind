import { getParseContent } from "./parsers/content.ts";
import { parseDefinitionItem } from "./parsers/definition_item.ts";
import { parseListItem } from "./parsers/list_item.ts";
import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

type Expression = (
  s: string,
  attribute?: string,
) => Element;

const singles: Record<string, Expression> = {
  // Url
  url: (href: string) => element("a", [href], { href }),
  // Titles
  chapter: (children: string) => element("h1", [children]),
  section: (children: string) => element("h2", [children]),
  subsection: (children: string) => element("h3", [children]),
  subsubsection: (children: string) => element("h4", [children]),
  paragraph: (children: string) => element("b", [children]),
  // Formatting
  texttt: (children: string) => element("code", [children]),
  textbf: (children: string) => element("b", [children]),
  textit: (children: string) => element("i", [children]),
  // Footnote
  // TODO: This needs numbering and https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover
  // TODO: Footnote contents can have expressions so they should go through the expression parser as well
  footnote: (children: string) => element("sup", [children]),
  // Citations
  // TODO: Same problem here but with varying output depending on citation type
  cite: (children: string) => element("sup", [children]),
  citet: (children: string) => element("sup", [children]),
  citep: (children: string) => element("sup", [children]),
};

const doubles: Record<string, Expression> = {
  // Url
  "href": (href: string, children?: string) =>
    element("a", [children || ""], href ? { href } : {}),
};

const blocks: Record<string, {
  container: (items: unknown[]) => Element | string;
  item: (getCharacter: CharacterGenerator) => unknown;
}> = {
  // Url
  "verbatim": {
    container: (children) => element("pre", children as string[]),
    item: getParseContent((s) => s.join("")),
  },
  // Lists
  "enumerate": {
    container: (children) => element("ol", children as string[]),
    item: (g) => element("li", [parseListItem(g)]),
  },
  "itemize": {
    container: (children) => element("ul", children as string[]),
    item: (g) => element("li", [parseListItem(g)]),
  },
  "description": {
    container: (children) => element("dl", children as string[]),
    item: (g) => {
      const { title, description } = parseDefinitionItem(g);

      return [element("dt", [title]), element("dd", [description])];
    },
  },
};

function element(
  type: string,
  children: string[],
  attributes?: Record<string, string>,
): Element {
  return {
    type,
    attributes: attributes || {},
    children,
  };
}

export { blocks, doubles, singles };
