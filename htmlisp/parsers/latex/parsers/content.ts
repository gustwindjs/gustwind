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

        const characterIndex = getCharacter.getIndex();
        let foundMatch = false;

        getCharacter.previous();

        // For async version this could use Promise.race
        for (const parser of parsers) {
          try {
            // @ts-ignore Ignore for now - most likely there's a type mismatch
            parts.push(parser(getCharacter));

            foundMatch = true;
            break;
          } catch (_error) {
            getCharacter.setIndex(characterIndex);
          }
        }

        if (!foundMatch) {
          getCharacter.previous();

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
