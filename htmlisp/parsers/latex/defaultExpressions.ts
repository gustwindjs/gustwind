import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { type BibtexCollection } from "./parsers/bibtex.ts";
import { parseDefinitionItem } from "./parsers/definition_item.ts";
import { parseListItem } from "./parsers/list_item.ts";
import type { Element } from "../../types.ts";

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
  footnote: (children, matchCounts) => {
    return ({
      type: "sup",
      attributes: { title: children[0] },
      children: [
        (matchCounts.footnote
          ? matchCounts.footnote.findIndex((e) => e === children[0]) + 1
          : 1).toString(),
      ],
    });
  },
  cite: (children, matchCounts) => {
    const ids = children[0].split(",").map((id) => id.trim());
    const entries = ids.map((id) => {
      const e = bibtexEntries[id];

      if (!e) {
        throw new Error("No matching BibTeX entry was found!");
      }

      return e;
    });

    const references = entries.map((entry) => {
      const title = entry.fields?.title;

      if (!title) {
        throw new Error("BibTeX entry was missing a title!");
      }

      return { title, author: entry.fields?.author || "" };
    });

    return {
      type: "span",
      attributes: {
        title: `${
          references.map(({ title, author }) => `${title} - ${author}`).join(
            ", ",
          )
        }`,
      },
      children: [
        "[" +
        (ids.map((id) =>
          matchCounts.cite ? matchCounts.cite.findIndex((e) => e === id) + 1 : 1
        )
          .join(", ").toString()) +
        "]",
      ],
    };
  },
  citet: (children) => {
    const ids = children[0].split(",").map((id) => id.trim());
    const entries = ids.map((id) => {
      const e = bibtexEntries[id];

      if (!e) {
        throw new Error("No matching BibTeX entry was found!");
      }

      return e;
    });

    const references = entries.map((entry) => {
      const title = entry.fields?.title;

      if (!title) {
        throw new Error("BibTeX entry was missing a title!");
      }

      const author = entry.fields?.author || "";

      return {
        title,
        author,
        surname: getFirstAuthorSurname(author),
        year: entry.fields?.year || "",
      };
    });

    const title = references.map(({ title, author }) => `${title} - ${author}`)
      .join(", ");
    const text = references.map(({ surname, year }) => `${surname} (${year})`)
      .join(", ");

    return ({
      type: "span",
      attributes: { title },
      children: [text],
    });
  },
  // TODO: Textual citation in parentheses (needs a bibtex lookup)
  citep: (children, matchCounts) => ({
    type: "span",
    attributes: { title: children[0] },
    children: [
      "(" +
      (matchCounts.citep
        ? matchCounts.citep.findIndex((e) => e === children[0]) + 1
        : 1)
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
});

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

    if (ref) {
      return {
        type: "a",
        attributes: { href: ref.slug },
        children: [ref.title],
      };
    }

    return {
      type: "a",
      attributes: { href: `#${slugify(id)}` },
      children: [getAutorefLabel(id) || id],
    };
  },
  nameref: (children) => {
    const id = children[0];
    const ref = refEntries.find(({ label }) => label === id);

    if (!ref) {
      throw new Error("No matching ref was found");
    }

    return ({
      type: "a",
      attributes: { href: ref.slug },
      children: [ref.title],
    });
  },
  ref: (children) => {
    const id = children[0];
    const ref = refEntries.find(({ label }) => label === id);

    if (!ref) {
      throw new Error("No matching ref was found");
    }

    return ({
      type: "a",
      attributes: { href: ref.slug },
      children: [ref.title],
    });
  },
});

function getAutorefLabel(id: string) {
  const [kind] = id.split(":");

  return kind || id;
}

function slugify(idBase: string) {
  return idBase.toLowerCase().replace(/`/g, "").replace(/[^\w]+/g, "-");
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

export { blocks, cites, doubles, el, element, lists, refs, singles };
