import { parseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

type ItemReturnValue = unknown;

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  getCharacter: CharacterGenerator,
  expressions: Record<
    string,
    {
      container: (items: (ItemReturnValue)[]) => Element | string;
      item: (getCharacter: CharacterGenerator) => ItemReturnValue;
    }
  >,
): string | Element {
  const begin = parseSingle(getCharacter, { begin: (i) => i });
  const items: ItemReturnValue[] = [];

  for (let i = 0; i < LIMIT; i++) {
    if (getCharacter.get() === null) {
      break;
    }
    const characterIndex = getCharacter.getIndex();

    try {
      const item = expressions[begin as string].item(getCharacter);

      if (item) {
        items.push(item);
      }
    } catch (_error) {
      getCharacter.setIndex(characterIndex);

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
