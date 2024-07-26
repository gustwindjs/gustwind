import type { CharacterGenerator } from "../../types.ts";

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: Record<string, number>,
  ) => { match: string; value: ExpressionReturnType })[],
  matchCounts?: Record<string, number>,
) {
  const characterIndex = getCharacter.getIndex();

  // For async version this could use Promise.race
  for (const parser of parsers) {
    try {
      return parser(getCharacter, matchCounts);
    } catch (_error) {
      getCharacter.setIndex(characterIndex);
    }
  }
}

export { runParsers };
