import type { CharacterGenerator } from "../../types.ts";

// element (cite etc.) -> input[] in discovery order
type MatchCounts = Record<string, Array<string>>;

type Parse<ExpressionReturnType> = (
  { getCharacter, matchCounts }: {
    getCharacter: CharacterGenerator;
    matchCounts?: MatchCounts;
  },
) => {
  match: string | boolean;
  value: string | ExpressionReturnType;
  matchCounts?: MatchCounts;
} | undefined;

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: (({ getCharacter, matchCounts, parse }: {
    getCharacter: CharacterGenerator;
    matchCounts?: MatchCounts;
    parse?: Parse<ExpressionReturnType>;
  }) => {
    match: string;
    value: string | ExpressionReturnType;
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
        return { match: false, value: "" };
      }

      const ret = parser({
        getCharacter,
        matchCounts,
        // @ts-expect-error Figure out how to type this
        parse: () => runParsers(getCharacter, matchCounts),
      });

      if (ret.match && ret.value) {
        return ret;
      }

      return {
        match: true,
        value: ret,
      };
    } catch (error) {
      // @ts-expect-error Figure out how to type this
      if (error.message === "No matching expression was found") {
        getCharacter.setIndex(characterIndex);
      } // @ts-expect-error Figure out how to type this
      else if (error.message !== "Skip") {
        throw error;
      }
    }
  }

  return { match: false, value: "" };
}

export { type MatchCounts, type Parse, runParsers };
