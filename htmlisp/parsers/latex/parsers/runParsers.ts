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
      const result = parser(getCharacter, matchCounts);

      // Without moving cursor back a step it would be in a wrong spot
      // for the next round assuming a result was parsed
      getCharacter.previous();

      return result;
    } catch (_error) {
      getCharacter.setIndex(characterIndex);
    }
  }
}

export { runParsers };
