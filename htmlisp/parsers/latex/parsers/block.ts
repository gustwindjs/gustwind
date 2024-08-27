import { getParseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";

type BlockParser<ExpressionReturnType, ItemReturnValue> = {
  container: (items: (ItemReturnValue)[]) => ExpressionReturnType;
  item?: (getCharacter: CharacterGenerator) => ItemReturnValue;
};

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function getParseBlock<ExpressionReturnType, ItemReturnValue>(
  expressions: Record<
    string,
    BlockParser<ExpressionReturnType, ItemReturnValue>
  >,
) {
  return function parseBlock(
    getCharacter: CharacterGenerator,
  ): ExpressionReturnType {
    const begin = getParseSingle<string>({ begin: (i) => i.join("") })(
      getCharacter,
    );
    const itemCb = expressions[begin.value].item;
    let items: ItemReturnValue[] = [];

    if (itemCb) {
      for (let i = 0; i < LIMIT; i++) {
        if (getCharacter.get() === null) {
          break;
        }
        const characterIndex = getCharacter.getIndex();

        try {
          const item = itemCb(getCharacter);

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
    }

    const end = getParseSingle<string>({ end: (i) => i.join("") })(
      getCharacter,
    );

    if (begin.value === end.value) {
      return expressions[begin.value].container(items);
    }

    throw new Error(`Expression matching to ${begin.value} was not found`);
  };
}

export { type BlockParser, getParseBlock };
