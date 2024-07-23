import { parseContent } from "./content.ts";
import { parseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  getCharacter: CharacterGenerator,
  // TODO: One good option might be to separate container and item parsers
  expressions: Record<string, Expression>,
): string | Element {
  const begin = parseSingle(getCharacter, { begin: (i) => i });

  // TODO: This is a bad assumption for a block since it can have \'s
  // TODO: Likely what should happen is that there's a bit of logic to capture
  // what's between begin and end and then that's handled separately
  const content = parseContent(getCharacter);

  console.log("b", begin, "c", content);

  const end = parseSingle(getCharacter, { end: (i) => i });

  if (begin === end) {
    return expressions[begin as string](content as string);
  }

  throw new Error("No matching expression was found");
}

export { parseBlock };
