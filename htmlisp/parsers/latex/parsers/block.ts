import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

enum STATES {
  IDLE,
  PARSE_BLOCK_START,
  PARSE_BLOCK_CONTENT,
  PARSE_BLOCK_END,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_CONTENT,
}

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element {
  let output = "";

  // TODO: 1. parse begin block - reuse single parser here
  // TODO: 2. parse block content - keep this simple for now
  // TODO: 3. parse end block - reuse single parser here

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return { type: "p", attributes: {}, children: [output] };
}

export { parseBlock };
