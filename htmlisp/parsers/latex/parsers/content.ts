import { type MatchCounts, runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses content until \n\n or string to parse ends
function getParseContent<ExpressionReturnType>(
  expression: (parts: ExpressionReturnType[]) => ExpressionReturnType,
  parsers: (({ getCharacter }: {
    getCharacter: CharacterGenerator;
  }) => { match: string; value: ExpressionReturnType })[] = [],
) {
  return function parseContent(
    { getCharacter }: {
      getCharacter: CharacterGenerator;
    },
  ): ExpressionReturnType {
    let stringBuffer = "";
    let foundComment = false;
    const parts: ExpressionReturnType[] = [];
    let matchCounts: MatchCounts = {};

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      // TODO: Allow also whitespace before a comment
      if (i === 0 && c === "%") {
        foundComment = true;
      }

      if (c === "\n" && getCharacter.get() === "\n") {
        break;
      } else if (c === "\\" && !foundComment) {
        // @ts-expect-error This is fine
        parts.push(stringBuffer);
        stringBuffer = "";

        getCharacter.previous();

        // TODO: Likely this could use parse() instead (constrain to singles and doubles?)
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

    // Skip comments
    if (stringBuffer.startsWith("%")) {
      throw new Error("Skip");
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
