import type { CharacterGenerator } from "../../types.ts";
import type { Expression } from "./../expressions.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

// Parses content until \ or \n\n or until string to parse ends
function getParseContent(
  expression: Expression,
  parsers: ((getCharacter: CharacterGenerator) => string | Element)[] = [],
) {
  return function parseContent(
    getCharacter: CharacterGenerator,
  ): string | Element {
    let stringBuffer = "";

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (c === "\n" && getCharacter.get() === "\n") {
        return expression(stringBuffer);
      } else if (c === "\\") {
        const characterIndex = getCharacter.getIndex();
        let foundMatch = false;

        getCharacter.previous();

        // For async version this could use Promise.race
        for (const parser of parsers) {
          try {
            // TODO: Figure out how this should work with element structure
            // @ts-ignore Ignore for now - most likely there's a type mismatch
            stringBuffer += parser(getCharacter);

            foundMatch = true;
            break;
          } catch (_error) {
            getCharacter.setIndex(characterIndex);
          }
        }

        if (!foundMatch) {
          getCharacter.previous();

          return expression(stringBuffer);
        }
      } else {
        stringBuffer += c;
      }
    }

    return expression(stringBuffer);
  };
}

export { getParseContent };
