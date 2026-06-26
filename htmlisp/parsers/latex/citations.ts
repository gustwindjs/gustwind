import type { Element } from "../../types.ts";
import type { BibtexCollection } from "./parsers/bibtex.ts";
import type { SingleParser } from "./parsers/single.ts";
import { childrenToText } from "./elements.ts";

type LatexNode = Element | string;
type CitationReference = {
  title: string;
  author: string;
};
type AuthorYearCitationReference = CitationReference & {
  surname: string;
  year: string;
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
  { author, surname, year }: ReturnType<
    typeof getAuthorYearCitationReferences
  >[number],
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

export { cites };
