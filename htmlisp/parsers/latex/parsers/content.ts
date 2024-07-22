import type { CharacterGenerator } from "../../types.ts";
import type { Element } from "../../../types.ts";

const LIMIT = 100000;

// Parses content until \
function parseContent(
  getCharacter: CharacterGenerator,
): string | Element {
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === "\\") {
      return stringBuffer;
    } else {
      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseContent };
