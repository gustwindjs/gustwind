import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// TODO: Rename parseUntil
// Moves character cursor until a non-empty character is found
function parseEmpty(
  getCharacter: CharacterGenerator,
  checkRule?: (c: string) => boolean,
): void {
  const isEmptyCharacter = checkRule || isDefaultEmptyCharacter;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (!isEmptyCharacter(c)) {
      getCharacter.previous();

      return;
    }
  }
}

function isDefaultEmptyCharacter(c: string) {
  return c === " " || c === `\n`;
}

export { parseEmpty };
