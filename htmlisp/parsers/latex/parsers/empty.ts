import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// TODO: Rename parseUntil
// Moves character cursor until a non-empty character is found
function parseEmpty(
  getCharacter: CharacterGenerator,
  checkRule?: (c: string) => boolean,
): void {
  if (!checkRule) {
    checkRule = (c: string) => c === " " || c === `\n`;
  }

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (checkRule(c)) {
      // Nothing to do
    } else {
      getCharacter.previous();

      return;
    }
  }
}

export { parseEmpty };
