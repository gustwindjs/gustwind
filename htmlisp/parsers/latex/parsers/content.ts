import { runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses content until \ or \n\n or until string to parse ends
function getParseContent<ExpressionReturnType>(
  expression: (parts: ExpressionReturnType[]) => ExpressionReturnType,
  parsers: ((
    getCharacter: CharacterGenerator,
  ) => { match: string; value: ExpressionReturnType })[] = [],
) {
  return function parseContent(
    getCharacter: CharacterGenerator,
  ): { match: boolean; value: ExpressionReturnType } {
    let stringBuffer = "";
    const parts: ExpressionReturnType[] = [];
    const matchCounts: Record<string, number> = {};

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (c === "\n" && getCharacter.get() === "\n") {
        break;
      } else if (c === "\\") {
        // @ts-expect-error This is fine
        parts.push(stringBuffer);
        stringBuffer = "";

        getCharacter.previous();

        const parseResult = runParsers<ExpressionReturnType>(
          getCharacter,
          parsers,
          matchCounts,
        );

        if (parseResult) {
          if (matchCounts[parseResult.match]) {
            matchCounts[parseResult.match]++;
          } else {
            matchCounts[parseResult.match] = 1;
          }

          parts.push(parseResult.value);
        } else {
          break;
        }
      } else {
        stringBuffer += c;
      }
    }

    if (stringBuffer) {
      // @ts-expect-error This is fine
      parts.push(stringBuffer);
    }

    const value = expression(parts);

    return { match: !!value, value };
  };
}

export { getParseContent };
