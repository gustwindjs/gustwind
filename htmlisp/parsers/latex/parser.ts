// Syntax prototype for a parser
// TODO: Hook these up with a parser engine + add missing details

const singleExpressions = [
  // Url
  // TODO: Clean up typing
  ["url", "a", (href: string) => ({ href }), id],
  // Titles
  ["chapter", "h1", noop, id],
  ["section", "h2", noop, id],
  ["subsection", "h3", noop, id],
  ["subsubsection", "h4", noop, id],
  ["paragraph", "b", noop, id],
  // Formatting
  ["texttt", "code", noop, id],
  ["textbf", "b", noop, id],
  ["textit", "i", noop, id],
  // Footnote
  // TODO: This needs numbering and https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/popover
  // TODO: Footnote contents can have expressions so they should go through the expression parser as well
  ["footnote", "sup", noop, id],
  // Citations
  // TODO: Same problem here but with varying output depending on citation type
  ["cite", "sup", noop, id],
  ["citet", "sup", noop, id],
  ["citep", "sup", noop, id],
];

const doubleExpressions = [
  // Url
  ["href", "a", (href: string) => ({ href }), (a: string) => a],
];

const blocks = [
  // Url
  ["verbatim", "pre", noop, id],
  // Lists
  // TODO: How to parse \item and how to model li for items? Maybe a subparser is needed
  ["enumerate", "ol", (content: string) => parse(content)],
  ["itemize", "ul", (content: string) => parse(content)],
  // TODO: This case is even more complex to parse since it's \item[Foo] bar
  // so this might need a parser of its own
  ["description", "dl", (content: string) => parse(content)],
];

// TODO
function parse(name: string) {}

function noop() {}

function id(s: string) {
  return s;
}
