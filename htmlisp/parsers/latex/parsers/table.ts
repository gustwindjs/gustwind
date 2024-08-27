import { getParseSingle } from "./single.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function getParseTable<ExpressionReturnType>(
  cbs: {
    container: (o: { caption: string; label: string }) => ExpressionReturnType;
  },
) {
  return function parseBlock(
    getCharacter: CharacterGenerator,
  ): ExpressionReturnType {
    const begin = getParseSingle<string>({ begin: (i) => i.join("") })(
      getCharacter,
    );
    // const itemCb = expressions[begin.value].item;
    // TODO
    // let items: {}[] = [];

    /*
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
    */

    // TODO: Parse caption
    const caption = "barfoo";

    // TODO: Parse label
    const label = "foobar";

    const end = getParseSingle<string>({ end: (i) => i.join("") })(
      getCharacter,
    );

    if (begin.value === end.value) {
      return cbs.container({ caption, label });
    }

    throw new Error(`Expression matching to ${begin.value} was not found`);
  };
}

export { getParseTable };
