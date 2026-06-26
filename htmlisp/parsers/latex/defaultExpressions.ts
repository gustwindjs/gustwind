import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { type BibtexCollection } from "./parsers/bibtex.ts";
import { parseDefinitionItem } from "./parsers/definition_item.ts";
import { parseListItem } from "./parsers/list_item.ts";
import type { Element } from "../../types.ts";

type LatexNode = Element | string;
type CitationReference = {
  title: string;
  author: string;
};
type AuthorYearCitationReference = CitationReference & {
  surname: string;
  year: string;
};

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

const cites = (
  bibtexEntries: Record<string, BibtexCollection>,
): Record<string, SingleParser<LatexNode>> => ({
  footnote: createFootnoteNode,
  cite: (children, matchCounts) =>
    createCitationNode(children, matchCounts, bibtexEntries),
  citet: (children) => createTextualCitationNode(children, bibtexEntries),
  citep: (children) => createParentheticalCitationNode(children, bibtexEntries),
  // TODO: Write reference using bibtex
  fullcite: (children) => ({
    type: "span",
    attributes: { title: children[0] },
    children: ["full cite goes here"],
  }),
});

function createFootnoteNode(
  children: string[],
  matchCounts: Record<string, string[]>,
) {
  const title = childrenToText(children);

  return {
    type: "sup",
    attributes: { title },
    children: [getFootnoteIndex(title, matchCounts.footnote).toString()],
  };
}

function getFootnoteIndex(title: string, footnotes: string[] | undefined) {
  return footnotes ? footnotes.findIndex((entry) => entry === title) + 1 : 1;
}

function createCitationNode(
  children: string[],
  matchCounts: Record<string, string[]>,
  bibtexEntries: Record<string, BibtexCollection>,
) {
  const ids = parseCitationIds(children[0]);
  const references = getCitationReferences(ids, bibtexEntries);

  return {
    type: "span",
    attributes: {
      title: createCitationTitle(references),
    },
    children: [formatCitationIndexes(ids, matchCounts.cite)],
  };
}

function formatCitationIndexes(ids: string[], citationMatches: string[]) {
  return `[${ids.map((id) => getCitationIndex(id, citationMatches)).join(", ")}]`;
}

function createTextualCitationNode(
  children: string[],
  bibtexEntries: Record<string, BibtexCollection>,
) {
  const references = getAuthorYearCitationReferences(
    parseCitationIds(children[0]),
    bibtexEntries,
  );

  return {
    type: "span",
    attributes: { title: createCitationTitle(references) },
    children: [formatTextualCitation(references)],
  };
}

function formatTextualCitation(
  references: ReturnType<typeof getAuthorYearCitationReferences>,
) {
  return references
    .map(({ surname, year }) => `${surname} (${year})`)
    .join(", ");
}

function createParentheticalCitationNode(
  children: string[],
  bibtexEntries: Record<string, BibtexCollection>,
) {
  const references = getAuthorYearCitationReferences(
    parseCitationIds(children[0]),
    bibtexEntries,
  );

  return {
    type: "span",
    attributes: { title: createCitationTitle(references) },
    children: [`(${formatParentheticalCitation(references)})`],
  };
}

function formatParentheticalCitation(
  references: ReturnType<typeof getAuthorYearCitationReferences>,
) {
  return references.map(formatParentheticalCitationReference).join("; ");
}

function formatParentheticalCitationReference(
  { author, surname, year }: ReturnType<typeof getAuthorYearCitationReferences>[number],
) {
  const authorCount = author.split(/\s+and\s+/i).filter(Boolean).length;
  const authorText = authorCount > 1 ? `${surname} et al.` : surname;

  return [authorText, year].filter(Boolean).join(", ");
}

function parseCitationIds(input: string) {
  return input
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getCitationReferences(
  ids: string[],
  bibtexEntries: Record<string, BibtexCollection>,
): CitationReference[] {
  return ids.map((id) => getCitationReference(bibtexEntries[id]));
}

function getAuthorYearCitationReferences(
  ids: string[],
  bibtexEntries: Record<string, BibtexCollection>,
): AuthorYearCitationReference[] {
  return ids.map((id) => getAuthorYearCitationReference(bibtexEntries[id]));
}

function getAuthorYearCitationReference(
  entry: BibtexCollection | undefined,
): AuthorYearCitationReference {
  const { title, author } = getCitationReference(entry);

  return {
    title,
    author,
    surname: getFirstAuthorSurname(author),
    year: entry?.fields?.year || "",
  };
}

function getCitationReference(
  entry: BibtexCollection | undefined,
): CitationReference {
  const fields = requireCitationFields(entry);
  const title = requireCitationTitle(fields.title);

  return { title, author: fields.author || "" };
}

function requireCitationFields(entry: BibtexCollection | undefined) {
  if (!entry) {
    throw new Error("No matching BibTeX entry was found!");
  }

  return entry.fields || {};
}

function requireCitationTitle(title: string | undefined) {
  if (!title) {
    throw new Error("BibTeX entry was missing a title!");
  }

  return title;
}

function createCitationTitle(references: CitationReference[]) {
  return references
    .map(({ title, author }) => `${title} - ${author}`)
    .join(", ");
}

function getCitationIndex(id: string, matches: string[] | undefined) {
  return matches ? matches.findIndex((e) => e === id) + 1 : 1;
}

function getFirstAuthorSurname(author: string) {
  const firstAuthor = author.split(/\s+and\s+/i)[0]?.trim() || "";

  if (firstAuthor.includes(",")) {
    return firstAuthor.split(",")[0].trim();
  }

  return firstAuthor.split(/\s+/).at(-1) || firstAuthor;
}

const refs = (
  refEntries: { title: string; label: string; slug: string }[],
): Record<string, SingleParser<LatexNode>> => ({
  autoref: (children, matchCounts) => {
    const id = children.join("") || matchCounts.autoref?.at(-1) || "";
    const ref = refEntries.find(({ label }) => label === id);

    return ref ? createAutorefLink(ref) : createAutorefFallback(id);
  },
  nameref: (children) => {
    const id = children[0];
    const ref = refEntries.find(({ label }) => label === id);

    if (!ref) {
      throw new Error("No matching ref was found");
    }

    return {
      type: "a",
      attributes: { href: ref.slug },
      children: [ref.title],
    };
  },
  ref: (children) => {
    const id = children[0];
    const ref = refEntries.find(({ label }) => label === id);

    if (!ref) {
      throw new Error("No matching ref was found");
    }

    return {
      type: "a",
      attributes: { href: ref.slug },
      children: [ref.title],
    };
  },
});

function createAutorefLink(ref: { title: string; slug: string }) {
  return {
    type: "a",
    attributes: { href: ref.slug },
    children: [ref.title],
  };
}

function createAutorefFallback(id: string) {
  return {
    type: "a",
    attributes: { href: `#${slugify(id)}` },
    children: [getAutorefLabel(id) || id],
  };
}

function getAutorefLabel(id: string) {
  const [kind] = id.split(":");

  return kind || id;
}

function slugify(idBase: string) {
  return idBase
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w]+/g, "-");
}

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

function childrenToText(children: (Element | string)[]): string {
  return children
    .map((child) =>
      typeof child === "string" ? child : childrenToText(child.children || []),
    )
    .join("");
}

export { blocks, cites, doubles, el, element, lists, refs, singles };
