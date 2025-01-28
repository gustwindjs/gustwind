import { getParseDouble } from "./double.ts";
import { getParseSingle } from "./single.ts";
import { parseEmpty } from "./empty.ts";
import { runParsers } from "./runParsers.ts";
import type { Parse } from "./types.ts";
import type { CharacterGenerator } from "../../types.ts";

type BlockParser<ExpressionReturnType> = {
  container: (items: (ExpressionReturnType)[]) => ExpressionReturnType;
  item: (
    { getCharacter, parse }: {
      getCharacter: CharacterGenerator;
      parse?: Parse<ExpressionReturnType>;
    },
  ) => ExpressionReturnType;
};

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function getParseBlock<ExpressionReturnType>(
  expressions: Record<
    string,
    BlockParser<ExpressionReturnType>
  >,
) {
  return function parseBlock({ getCharacter, parse }: {
    getCharacter: CharacterGenerator;
    parse?: Parse<ExpressionReturnType>;
  }): ExpressionReturnType {
    const parseResult = runParsers<ExpressionReturnType>(
      getCharacter,
      [
        [getParseDouble({ begin: (i) => i }), []],
        [getParseSingle({ begin: joinString }), []],
      ],
    );

    let beginValue: string = "";
    if (parseResult?.match) {
      // @ts-expect-error This is fine
      beginValue = parseResult.value;
    }

    if (!beginValue) {
      throw new Error("Error: Missing begin statement");
    }

    const itemCb = expressions[beginValue].item;
    let items: ExpressionReturnType[] = [];

    getCharacter.next();

    for (let i = 0; i < LIMIT; i++) {
      if (getCharacter.get() === null) {
        break;
      }
      const characterIndex = getCharacter.getIndex();

      try {
        const item = itemCb({ getCharacter, parse });

        if (item) {
          if (Array.isArray(item)) {
            if (item.length) {
              items = items.concat([item]);
            }
          } else {
            items.push(item);
          }

          getCharacter.next();
        }
      } catch (_error) {
        getCharacter.setIndex(characterIndex);

        break;
      }
    }

    parseEmpty({ getCharacter });

    const end = getParseSingle<string>({ end: (i) => i.join("") })(
      { getCharacter },
    );

    if (beginValue === end.value) {
      return expressions[beginValue].container(items);
    }

    throw new Error("Error: Matching end statement was not found");
    // throw new Error(`Expression matching to ${beginValue} was not found`);
  };
}

function joinString(i: string[]) {
  return i.join("");
}

export { type BlockParser, getParseBlock };
