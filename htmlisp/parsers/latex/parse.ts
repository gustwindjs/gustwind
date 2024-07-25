import { getParseSingle } from "./parsers/single.ts";
import { getParseDouble } from "./parsers/double.ts";
import { getParseBlock } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { blocks, doubles, singles } from "./expressions.ts";
import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

const LIMIT = 100000;

const parsers = [
  getParseSingle(singles),
  getParseDouble(doubles),
  getParseBlock(blocks),
  getParseContent((children) => ({
    type: "p",
    attributes: {},
    children: [children],
  })),
];

function parse(
  getCharacter: CharacterGenerator,
): Element[] {
  const ret = [];
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const characterIndex = getCharacter.getIndex();

    // For async version this could use Promise.race
    for (const parser of parsers) {
      try {
        // @ts-ignore Ignore for now - most likely there's a type mismatch
        ret.push(parser(getCharacter));

        break;
      } catch (_error) {
        getCharacter.setIndex(characterIndex);
      }
    }

    // Default case - paragraph
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    stringBuffer += c;
  }

  if (stringBuffer.trim()) {
    ret.push({ type: "p", attributes: {}, children: [stringBuffer] });
  }

  // @ts-ignore Ignore for now - most likely there's a type mismatch
  return ret;
}

export { parse };
