import { getParseBlock } from "./block.ts";
import { getParseSingle } from "./single.ts";
import { parseTabularItem } from "./tabular_item.ts";
import { runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

type TableParseResult = {
  caption?: string;
  label?: string;
  header?: string[];
  rows?: string[][];
};

// Parses \begin{table}...\end{table} form
function parseTable(
  { getCharacter }: {
    getCharacter: CharacterGenerator;
  },
): TableParseResult {
  const parsedValues: TableParseResult = {};

  // TODO: The problem with this solution is that it doesn't validate the location
  // of \begin and \end. Likely this could be solved by letting runParsers
  // return more metadata about the matches so order can be validated.
  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<string>(
      getCharacter,
      [
        // @ts-expect-error This is fine for now. TODO: Fix runParsers type
        getParseBlock({
          tabular: {
            container: ([header, ...rows]) => {
              parsedValues.header = header;
              parsedValues.rows = rows;
            },
            item: parseTabularItem,
          },
        }),
        getParseSingle({
          begin: joinString,
          caption: joinString,
          label: joinString,
          end: joinString,
        }),
      ],
    );

    if (parseResult?.match) {
      // @ts-ignore Ok for now
      parsedValues[parseResult.match] = parseResult.value;
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  // @ts-ignore Ok for now
  if (parsedValues.begin === parsedValues.end) {
    // @ts-ignore Ok for now
    delete parsedValues.begin;
    // @ts-ignore Ok for now
    delete parsedValues.end;

    return parsedValues;
  }

  throw new Error(
    // @ts-ignore Ok for now
    `Expression matching to ${parsedValues.begin} was not found`,
  );
}

function joinString(i: string[]) {
  return i.join("");
}

export { parseTable };
