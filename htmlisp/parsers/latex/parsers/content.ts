import { runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

// Parses content until \ or \n\n or until string to parse ends
function getParseContent(
  expression: (parts: string[]) => string | Element,
  parsers: ((getCharacter: CharacterGenerator) => string | Element)[] = [],
) {
  return function parseContent(
    getCharacter: CharacterGenerator,
  ): string | Element {
    let stringBuffer = "";
    const parts: string[] = [];

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (c === "\n" && getCharacter.get() === "\n") {
        break;
      } else if (c === "\\") {
        parts.push(stringBuffer);
        stringBuffer = "";

        getCharacter.previous();

        const parseResult = runParsers(getCharacter, parsers);

        if (parseResult) {
          // TODO: Likely typing should be cleaned up here
          parts.push(parseResult as string);
        } else {
          break;
        }
      } else {
        stringBuffer += c;
      }
    }

    if (stringBuffer) {
      parts.push(stringBuffer);
    }

    return expression(parts);
  };
}

export { getParseContent };
