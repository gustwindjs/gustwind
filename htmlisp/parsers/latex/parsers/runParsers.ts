import type { CharacterGenerator } from "../../types.ts";
import type { MatchCounts, Parse } from "./types.ts";

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  // Tuple of parsers and their possible subparsers
  parsers: [Parse<ExpressionReturnType>, Parse<ExpressionReturnType>[]][],
  matchCounts?: MatchCounts,
) {
  // For async version this could use Promise.race
  for (const [parser, subparsers] of parsers) {
    return runParser<ExpressionReturnType>({
      getCharacter,
      parser,
      subparsers,
      matchCounts,
    });
  }

  return { match: false, value: "" };
}

function runParser<ExpressionReturnType>(
  { getCharacter, parser, subparsers, matchCounts }: {
    getCharacter: CharacterGenerator;
    parser: Parse<ExpressionReturnType>;
    subparsers: Parse<ExpressionReturnType>[];
    matchCounts?: MatchCounts;
  },
) {
  const characterIndex = getCharacter.getIndex();

  try {
    const c = getCharacter.get();

    // Skip newlines and nulls
    if (c === "\n" || c === null) {
      return { match: false, value: "" };
    }

    const ret = parser({
      getCharacter,
      matchCounts,
      // @ts-expect-error TODO: Figure out how to deal with the return type
      parse: ({ getCharacter, matchCounts }) =>
        runParsers(
          getCharacter,
          // Assume subparsers cannot have subparsers
          subparsers.map((p) => [p, []]),
          matchCounts,
        ),
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

export { runParser, runParsers };
