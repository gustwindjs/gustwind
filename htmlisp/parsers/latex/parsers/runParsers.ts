import type { CharacterGenerator } from "../../types.ts";
import type { Parse } from "./types.ts";

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  // Tuple of parsers and their possible subparsers
  parsers: [Parse<ExpressionReturnType>, Parse<ExpressionReturnType>[]][],
) {
  // For async version this could use Promise.race
  for (const [parser, subparsers] of parsers) {
    const ret = runParser<ExpressionReturnType>({
      getCharacter,
      parser,
      subparsers,
    });

    if (ret.match) {
      return ret;
    }
  }

  return { match: false, value: "" };
}

function runParser<ExpressionReturnType>(
  { getCharacter, parser, subparsers }: {
    getCharacter: CharacterGenerator;
    parser: Parse<ExpressionReturnType>;
    subparsers?: Parse<ExpressionReturnType>[];
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
      parse: ({ getCharacter }) =>
        runParsers(
          getCharacter,
          // Assume subparsers cannot have subparsers
          (subparsers || []).map((p) => [p, []]),
        ),
    });

    if (ret.match && ret.value) {
      return ret;
    }

    return {
      match: true,
      value: ret.value,
    };
  } catch (error) {
    // @ts-expect-error Figure out how to type this
    if (error.message.startsWith("Error:")) {
      getCharacter.setIndex(characterIndex);
    } // @ts-expect-error Figure out how to type this
    else if (error.message !== "Skip") {
      throw error;
    }
  }

  return { match: false, value: "" };
}

export { runParser, runParsers };
