import type { CharacterGenerator } from "../../types.ts";

// element (cite etc.) -> input[] in discovery order
type MatchCounts = Record<string, Array<string>>;
type ParserResult<ExpressionReturnType> = {
  match: string;
  value: ExpressionReturnType;
  matchCounts?: MatchCounts;
};
type Parser<ExpressionReturnType> = (
  getCharacter: CharacterGenerator,
  matchCounts?: MatchCounts,
) => ParserResult<ExpressionReturnType>;

function runParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: Parser<ExpressionReturnType>[],
  matchCounts?: MatchCounts,
) {
  const characterIndex = getCharacter.getIndex();

  // For async version this could use Promise.race
  for (const parser of parsers) {
    const result = tryParser(parser, getCharacter, characterIndex, matchCounts);

    if (result) {
      return result;
    }
  }
}

function tryParser<ExpressionReturnType>(
  parser: Parser<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  characterIndex: number,
  matchCounts?: MatchCounts,
) {
  try {
    if (shouldSkipCurrentCharacter(getCharacter)) {
      return { match: false };
    }

    return parseWithParser(parser, getCharacter, matchCounts);
  } catch (error) {
    handleParserError(error, getCharacter, characterIndex);
  }
}

function handleParserError(
  error: unknown,
  getCharacter: CharacterGenerator,
  characterIndex: number,
) {
  if (shouldResetParser(error)) {
    getCharacter.setIndex(characterIndex);

    return;
  }

  if (!shouldSkipParser(error)) {
    throw error;
  }
}

function shouldSkipCurrentCharacter(getCharacter: CharacterGenerator) {
  const c = getCharacter.get();

  // Skip newlines and nulls
  return c === "\n" || c === null;
}

function parseWithParser<ExpressionReturnType>(
  parser: Parser<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  matchCounts?: MatchCounts,
) {
  const ret = parser(getCharacter, matchCounts);

  if (ret?.match && ret.value) {
    return ret;
  }

  return {
    match: true,
    value: ret,
  };
}

function shouldResetParser(error: unknown) {
  return (
    error instanceof Error &&
    error.message === "No matching expression was found"
  );
}

function shouldSkipParser(error: unknown) {
  return error instanceof Error && error.message === "Skip";
}

export { type MatchCounts, runParsers };
