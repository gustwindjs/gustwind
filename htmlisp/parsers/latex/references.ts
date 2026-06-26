import type { Element } from "../../types.ts";
import type { SingleParser } from "./parsers/single.ts";

type LatexNode = Element | string;
type RefEntry = { title: string; label: string; slug: string };

const refs = (
  refEntries: RefEntry[],
): Record<string, SingleParser<LatexNode>> => ({
  autoref: (children, matchCounts) => {
    const id = children.join("") || matchCounts.autoref?.at(-1) || "";
    const ref = refEntries.find(({ label }) => label === id);

    return ref ? createAutorefLink(ref) : createAutorefFallback(id);
  },
  nameref: (children) => createRequiredRefLink(children[0], refEntries),
  ref: (children) => createRequiredRefLink(children[0], refEntries),
});

function createRequiredRefLink(id: string, refEntries: RefEntry[]) {
  const ref = refEntries.find(({ label }) => label === id);

  if (!ref) {
    throw new Error("No matching ref was found");
  }

  return {
    type: "a",
    attributes: { href: ref.slug },
    children: [ref.title],
  };
}

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

export { refs };
