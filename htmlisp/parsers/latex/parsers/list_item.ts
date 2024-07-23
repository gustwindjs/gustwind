import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses the content following \item
function parseListItem(
  getCharacter: CharacterGenerator,
): string {
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === "\\") {
      getCharacter.previous();

      return stringBuffer;
    } else {
      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseListItem };
