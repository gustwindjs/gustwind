import { getParseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function getParseBlock<ExpressionReturnType, ItemReturnValue>(
  expressions: Record<
    string,
    {
      container: (items: (ItemReturnValue)[]) => ExpressionReturnType;
      item: (getCharacter: CharacterGenerator) => ItemReturnValue;
    }
  >,
) {
  return function parseBlock(
    getCharacter: CharacterGenerator,
  ): ExpressionReturnType {
    const begin = getParseSingle<string>({ begin: (i) => i })(
      getCharacter,
    );
    let items: ItemReturnValue[] = [];

    for (let i = 0; i < LIMIT; i++) {
      if (getCharacter.get() === null) {
        break;
      }
      const characterIndex = getCharacter.getIndex();

      try {
        const item = expressions[begin as string].item(getCharacter);

        if (item) {
          // TODO: Test this case
          if (Array.isArray(item)) {
            items = items.concat(item);
          } else {
            items.push(item);
          }
        }
      } catch (_error) {
        getCharacter.setIndex(characterIndex);

        break;
      }
    }

    const end = getParseSingle<string>({ end: (i) => i })(getCharacter);

    if (begin === end) {
      return expressions[begin as string].container(items);
    }

    throw new Error("No matching expression was found");
  };
}

export { getParseBlock };