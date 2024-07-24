import { parseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  getCharacter: CharacterGenerator,
  expressions: Record<
    string,
    {
      container: (items: (Element | string)[]) => Element | string;
      item: (getCharacter: CharacterGenerator) => Element | string;
    }
  >,
): string | Element {
  const begin = parseSingle(getCharacter, { begin: (i) => i });
  const items: (Element | string)[] = [];

  for (let i = 0; i < LIMIT; i++) {
    if (getCharacter.get() === null) {
      break;
    }

    try {
      const item = expressions[begin as string].item(getCharacter);

      if (item) {
        items.push(item);
      }
    } catch (_error) {
      break;
    }
  }

  const end = parseSingle(getCharacter, { end: (i) => i });

  if (begin === end) {
    return expressions[begin as string].container(items);
  }

  throw new Error("No matching expression was found");
}

export { parseBlock };
