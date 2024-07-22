import { parseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element {
  let output = "";

  const begin = parseSingle({
    begin: (i) => i,
  }, getCharacter);
  // TODO: Set up a content parser that terminates on \
  // TODO: Parse end block
  // TODO: Compile parsing results

  console.log("begin", begin);

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
