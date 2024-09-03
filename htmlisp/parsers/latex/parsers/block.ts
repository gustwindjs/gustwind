import { getParseDouble } from "./double.ts";
import { getParseSingle } from "./single.ts";
import { parseEmpty } from "./empty.ts";
import { runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

type BlockParser<ExpressionReturnType, ItemReturnValue> = {
  container: (items: (ItemReturnValue)[]) => ExpressionReturnType;
  item: (
    getCharacter: CharacterGenerator,
  ) => { match: boolean; value: ItemReturnValue };
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
  ): { match: boolean; value: ExpressionReturnType } {
    const parseResult = runParsers<ExpressionReturnType>(
      getCharacter,
      [
        // @ts-expect-error This is fine for now. TODO: Fix runParsers type
        getParseDouble({ begin: (i) => i }),
        // @ts-expect-error This is fine for now. TODO: Fix runParsers type
        getParseSingle({ begin: joinString }),
      ],
    );

    getCharacter.next();

    let beginValue: string = "";
    if (parseResult?.match) {
      // @ts-expect-error This is fine
      beginValue = parseResult.value;
    }

    if (!beginValue) {
      throw new Error("begin was not found");
    }

    const itemCb = expressions[beginValue].item;
    let items: ItemReturnValue[] = [];

    for (let i = 0; i < LIMIT; i++) {
      if (getCharacter.get() === null) {
        break;
      }
      const characterIndex = getCharacter.getIndex();

      try {
        const item = itemCb(getCharacter);

        if (item.match) {
          if (Array.isArray(item.value)) {
            if (item.value.length) {
              items = items.concat([item.value]);
            }
          } else {
            items.push(item.value);
          }
        }
      } catch (_error) {
        getCharacter.setIndex(characterIndex);

        break;
      }
    }

    parseEmpty(getCharacter);

    const end = getParseSingle<string>({ end: (i) => i.join("") })(
      getCharacter,
    );

    if (beginValue === end.value) {
      return { match: true, value: expressions[beginValue].container(items) };
    }

    throw new Error(`Expression matching to ${beginValue} was not found`);
  };
}

function joinString(i: string[]) {
  return i.join("");
}

export { type BlockParser, getParseBlock };
