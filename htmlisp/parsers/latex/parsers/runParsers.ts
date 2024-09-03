import type { CharacterGenerator } from "../../types.ts";

// element (cite etc.) -> input -> count
type MatchCounts = Record<string, Record<string, number>>;

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => { match: string; value: ExpressionReturnType })[],
  matchCounts?: MatchCounts,
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

export { type MatchCounts, runParsers };
