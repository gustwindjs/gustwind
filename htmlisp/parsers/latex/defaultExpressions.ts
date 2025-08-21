import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { type BibtexCollection } from "./parsers/bibtex.ts";
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
  href: (href: string, children?: string) =>
    element("a", [children || ""], href ? { href } : {}),
};

const blocks: Record<string, BlockParser<Element, Element>> = {
  verbatim: {
    container: (children) => element("pre", children),
    item: getParseContent<Element>((children) => ({
      type: "",
      attributes: {},
      children,
    })),
  },
  quote: {
    container: (children) => element("blockquote", children),
    item: getParseContent<Element>((children) => ({
      type: "",
      attributes: {},
      children,
    })),
  },
};

const lists: Record<string, BlockParser<Element, Element>> = {
  enumerate: {
    container: (children) => element("ol", children),
    item: (o) =>
      element("li", [
        // @ts-expect-error Figure out how to type this
        parseListItem(o),
      ]),
  },
  itemize: {
    container: (children) => element("ul", children),
    item: (o) =>
      element("li", [
        // @ts-expect-error Figure out how to type this
        parseListItem(o),
      ]),
  },
  description: {
    container: (children) => element("dl", children),
    item: (o) => {
      const { title, description } = parseDefinitionItem(o);

      return element("", [
        element("dt", [title]),
        element("dd", [description]),
      ]);
    },
  },
};

// TODO: Figure out a better spot for this state as it should be per execution, not module
let foundFootnotes = 0;
const cites = (
  bibtexEntries: Record<string, BibtexCollection>,
): Record<string, SingleParser<Element>> => ({
  footnote: (children) => {
    foundFootnotes++;

    return ({
      type: "sup",
      attributes: { title: children[0] },
      children: [foundFootnotes.toString()],
    });
  },
  cite: (children) => {
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
        // TODO: Check this logic
        "0" +
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
        // TODO: How about multiple authors?
        surname: author.split(" ")[1],
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
  citep: (children) => ({
    type: "span",
    attributes: { title: children[0] },
    children: [
      "(" +
      // TODO: Check this logic
      "0" +
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

const refs = (
  refEntries: { title: string; label: string; slug: string }[],
): Record<string, SingleParser<Element>> => ({
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
});

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
