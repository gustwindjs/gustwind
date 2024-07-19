import type { CharacterGenerator } from "../types.ts";

const LIMIT = 100000;

function parseParagraph(
  getCharacter: CharacterGenerator,
): string {
  let ret = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    ret += c;
  }

  return ret;
}

export { parseParagraph };
