import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses content until \ or \n\n or until string to parse ends
function parseContent(
  getCharacter: CharacterGenerator,
): string {
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === "\\" || (c === "\n" && getCharacter.get() === "\n")) {
      getCharacter.previous();

      return stringBuffer;
    } else {
      stringBuffer += c;
    }
  }

  return stringBuffer;
}

export { parseContent };
