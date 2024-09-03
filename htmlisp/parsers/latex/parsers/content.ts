import { type MatchCounts, runParsers } from "./runParsers.ts";
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
    const matchCounts: MatchCounts = {};

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
          // @ts-expect-error Assume that value has a toString() anyway
          const parseValue = parseResult.value.toString();

          if (matchCounts[parseResult.match]?.[parseValue]) {
            matchCounts[parseResult.match][parseValue]++;
          } else {
            if (!matchCounts[parseResult.match]) {
              matchCounts[parseResult.match] = {};
            }

            matchCounts[parseResult.match][parseValue] = 1;
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
