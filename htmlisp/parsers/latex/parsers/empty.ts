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
    if (advanceEmptyCharacter(getCharacter, isEmptyCharacter)) {
      break;
    }
  }
}

function advanceEmptyCharacter(
  getCharacter: CharacterGenerator,
  isEmptyCharacter: (c: string) => boolean,
) {
  const c = getCharacter.next();

  if (c === null) {
    return true;
  }

  return rewindAfterContent(getCharacter, c, isEmptyCharacter);
}

function rewindAfterContent(
  getCharacter: CharacterGenerator,
  c: string,
  isEmptyCharacter: (c: string) => boolean,
) {
  if (isEmptyCharacter(c)) {
    return false;
  }

  getCharacter.previous();

  return true;
}

function isDefaultEmptyCharacter(c: string) {
  return c === " " || c === `\n`;
}

export { parseEmpty };
