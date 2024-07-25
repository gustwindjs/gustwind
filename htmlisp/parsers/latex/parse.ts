import { parseSingle } from "./parsers/single.ts";
import { parseDouble } from "./parsers/double.ts";
import { parseBlock } from "./parsers/block.ts";
import { blocks, doubles, singles } from "./expressions.ts";
import type { CharacterGenerator } from "../types.ts";
import type { Expression } from "./expressions.ts";
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

// TODO: Where to handle paragraphs?

// TODO: This should run subparsers somehow
function parse(
  // TODO: This might be too specific - maybe it's better to split
  // up subparsers per type and pass the parsers here instead
  expressions: {
    singles: Expression[];
    doubles: Expression[];
    blocks: Expression[];
  },
  getCharacter: CharacterGenerator,
): Element[] {
  // TODO: Put this together from smaller parsers while configuring them

  let output = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return [{ type: "p", attributes: {}, children: [output] }];
}

export { parse };
