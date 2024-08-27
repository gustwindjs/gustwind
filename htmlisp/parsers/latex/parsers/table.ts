import { getParseSingle } from "./single.ts";
import { runParsers } from "./runParsers.ts";
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
    const parsedValues: Record<string, ExpressionReturnType> = {};

    // TODO: The problem with this solution is that it doesn't validate the location
    // of \begin and \end. Likely this could be solved by letting runParsers
    // return more metadata about the matches so order can be validated.
    for (let i = 0; i < LIMIT; i++) {
      const parseResult = runParsers<ExpressionReturnType>(
        getCharacter,
        // @ts-expect-error This is fine for now. TODO: Fix runParsers type
        [getParseSingle({
          begin: joinString,
          caption: joinString,
          label: joinString,
          end: joinString,
        })],
      );

      if (parseResult?.match) {
        parsedValues[parseResult.match] = parseResult.value;
      }

      const c = getCharacter.next();

      if (c === null) {
        break;
      }
    }

    if (parsedValues.begin === parsedValues.end) {
      return cbs.container(
        // @ts-ignore This is ok for now (different sized type)
        parsedValues,
      );
    }

    throw new Error(
      `Expression matching to ${parsedValues.begin} was not found`,
    );
  };
}

function joinString(i: string[]) {
  return i.join("");
}

export { getParseTable };
