import { type MatchCounts, type Parse } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses content until \n\n or string to parse ends
function getParseContent<ExpressionReturnType>(
  expression: (parts: ExpressionReturnType[]) => ExpressionReturnType,
) {
  return function parseContent(
    { getCharacter, parse }: {
      getCharacter: CharacterGenerator;
      parse?: Parse<ExpressionReturnType>;
    },
  ) {
    let stringBuffer = "";
    let foundComment = false;
    const parts: (string | ExpressionReturnType)[] = [];
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
        parts.push(stringBuffer);
        stringBuffer = "";

        getCharacter.previous();

        const parseResult = parse && parse({
          getCharacter,
          matchCounts: structuredClone(matchCounts),
        });

        if (parseResult) {
          if (parseResult.matchCounts) {
            matchCounts = parseResult.matchCounts;
          }

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
      parts.push(stringBuffer);
    }

    // @ts-expect-error This is fine
    const value = expression(parts);

    if (!!value) {
      return value;
    }

    throw new Error("No matching expression was found");
  };
}

export { getParseContent };
