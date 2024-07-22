import type { Element } from "../../types.ts";

type Expression = [string, (s: string, attribute?: string) => Element];

const singles: Expression[] = [
  // Url
  ["url", (href: string) => element("a", href, { href })],
  // Titles
  ["chapter", (children: string) => element("h1", children)],
  ["section", (children: string) => element("h2", children)],
  ["subsection", (children: string) => element("h3", children)],
  ["subsubsection", (children: string) => element("h4", children)],
  ["paragraph", (children: string) => element("b", children)],
  // Formatting
  ["texttt", (children: string) => element("code", children)],
  ["textbf", (children: string) => element("b", children)],
  ["textit", (children: string) => element("i", children)],
  // Footnote
  // TODO: This needs numbering and https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover
  // TODO: Footnote contents can have expressions so they should go through the expression parser as well
  ["footnote", (children: string) => element("sup", children)],
  // Citations
  // TODO: Same problem here but with varying output depending on citation type
  ["cite", (children: string) => element("sup", children)],
  ["citet", (children: string) => element("sup", children)],
  ["citep", (children: string) => element("sup", children)],
];

const doubles: Expression[] = [
  // Url
  [
    "href",
    (children: string, href?: string) =>
      element("a", children, href ? { href } : {}),
  ],
];

const blocks: Expression[] = [
  // Url
  ["verbatim", (children: string) => element("pre", children)],
  // Lists
  // TODO: How to parse \item and how to model li for items? Maybe a subparser is needed
  ["enumerate", (children: string) => element("ol", children)],
  ["itemize", (children: string) => element("ul", children)],
  // TODO: This case is even more complex to parse since it's \item[Foo] bar
  // so this might need a parser of its own
  ["description", (children: string) => element("dl", children)],
];

function element(
  type: string,
  children: string,
  attributes?: Record<string, string>,
): Element {
  return {
    type,
    attributes: attributes || {},
    children: [children],
  };
}

export type { Expression };
export { blocks, doubles, singles };
