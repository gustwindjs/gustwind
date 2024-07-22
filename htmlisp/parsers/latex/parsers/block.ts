import { parseContent } from "./content.ts";
import { parseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  getCharacter: CharacterGenerator,
  expressions: Record<string, Expression>,
): string | Element {
  const begin = parseSingle(getCharacter, { begin: (i) => i });
  const content = parseContent(getCharacter);
  const end = parseSingle(getCharacter, { end: (i) => i });

  if (begin === end) {
    return expressions[begin as string](content as string);
  }

  throw new Error("No matching expression was found");
}

export { parseBlock };
