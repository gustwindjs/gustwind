import { parseSingle } from "./parsers/single.ts";
import { parseDouble } from "./parsers/double.ts";
import { parseBlock } from "./parsers/block.ts";
import { blocks, doubles, singles } from "./expressions.ts";
import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

const LIMIT = 100000;

// TODO: Curry pattern would be cleaner for these
const singleParser = (characterGenerator: CharacterGenerator) =>
  parseSingle(characterGenerator, singles);
const doubleParser = (characterGenerator: CharacterGenerator) =>
  parseDouble(characterGenerator, doubles);
// TODO: Typing here is a little nasty.
// It's likely better with a generic or some simplification
const blockParser = (characterGenerator: CharacterGenerator) =>
  parseBlock(characterGenerator, blocks);
const parsers = [singleParser, doubleParser, blockParser];

function parse(
  getCharacter: CharacterGenerator,
): Element[] {
  let output = "";

  for (let i = 0; i < LIMIT; i++) {
    const characterIndex = getCharacter.getIndex();

    // For async version this could use Promise.race
    for (const parser of parsers) {
      try {
        // TODO: Support more complex compositions
        // @ts-ignore Ignore for now - most likely there's a type mismatch
        return [parser(getCharacter)];
      } catch (_error) {
        getCharacter.setIndex(characterIndex);
      }
    }

    // Default case - paragraph
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return [{ type: "p", attributes: {}, children: [output] }];
}

export { parse };
