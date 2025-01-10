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
  ): ExpressionReturnType {
    let stringBuffer = "";
    const parts: ExpressionReturnType[] = [];
    let matchCounts: MatchCounts = {};

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
          structuredClone(matchCounts),
        );

        if (parseResult) {
          // @ts-expect-error There's some type confusion here
          if (parseResult.matchCounts) {
            // @ts-expect-error There's some type confusion here
            matchCounts = parseResult.matchCounts;
          }

          // @ts-expect-error There's some type confusion here
          parts.push(parseResult.value);
        } else {
          break;
        }
      } else if (c === "~" && getCharacter.get() === "\\") {
        stringBuffer += " ";
      } else {
        stringBuffer += c;
      }
    }

    if (stringBuffer) {
      // @ts-expect-error This is fine
      parts.push(stringBuffer);
    }

    const value = expression(parts);

    if (!!value) {
      return value;
    }

    throw new Error("No matching expression was found");
  };
}

export { getParseContent };
