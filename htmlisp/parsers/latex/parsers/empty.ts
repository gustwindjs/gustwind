import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Moves character cursor until a non-empty character is found
function parseEmpty(
  getCharacter: CharacterGenerator,
): void {
  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === " " || c === `\n`) {
      // Nothing to do
    } else {
      getCharacter.previous();

      return;
    }
  }
}

export { parseEmpty };
