import type { CharacterGenerator } from "../../types.ts";

// element (cite etc.) -> input[] in discovery order
type MatchCounts = Record<string, Array<string>>;

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts?: MatchCounts,
) {
  const characterIndex = getCharacter.getIndex();

  // For async version this could use Promise.race
  for (const parser of parsers) {
    try {
      const c = getCharacter.get();

      // Skip newlines and nulls
      if (c === "\n" || c === null) {
        return { match: false };
      }

      const ret = parser(getCharacter, matchCounts);

      if (ret.match && ret.value) {
        return ret;
      }

      return {
        match: true,
        value: ret,
      };
    } catch (_error) {
      getCharacter.setIndex(characterIndex);
    }
  }
}

export { type MatchCounts, runParsers };
