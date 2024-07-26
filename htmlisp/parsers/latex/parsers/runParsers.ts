import type { CharacterGenerator } from "../../types.ts";

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers:
    ((
      getCharacter: CharacterGenerator,
    ) => { match: string; value: ExpressionReturnType })[],
) {
  const characterIndex = getCharacter.getIndex();

  // For async version this could use Promise.race
  for (const parser of parsers) {
    try {
      return parser(getCharacter);
    } catch (_error) {
      getCharacter.setIndex(characterIndex);
    }
  }
}

export { runParsers };
