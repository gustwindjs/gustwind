import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_CONTENT,
}

const LIMIT = 100000;

// Parses \<expression>{<parameter1>}{<parameter2>} form
function parseDouble(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element[] {
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

export { parseDouble };
