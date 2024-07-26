import type { CharacterGenerator } from "../../types.ts";
import type { Parser } from "../types.ts";

function runParsers(
  getCharacter: CharacterGenerator,
  parsers: Parser[],
) {
  const characterIndex = getCharacter.getIndex();

  // For async version this could use Promise.race
  for (const parser of parsers) {
    try {
      // @ts-ignore Ignore for now - most likely there's a type mismatch
      return parser(getCharacter);
    } catch (_error) {
      getCharacter.setIndex(characterIndex);
    }
  }
}

export { runParsers };
