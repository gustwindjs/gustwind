import { type MatchCounts, runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;
type ParseContentState<ExpressionReturnType> = {
  stringBuffer: string;
  foundComment: boolean;
  parts: ExpressionReturnType[];
  matchCounts: MatchCounts;
};

// Parses content until \ or \n\n or until string to parse ends
function getParseContent<ExpressionReturnType>(
  expression: (
    parts: ExpressionReturnType[],
  ) => ExpressionReturnType | undefined,
  parsers: ((
    getCharacter: CharacterGenerator,
  ) => { match: string; value: ExpressionReturnType })[] = [],
) {
  return function parseContent(
    getCharacter: CharacterGenerator,
    initialMatchCounts?: MatchCounts,
  ): ExpressionReturnType {
    const state: ParseContentState<ExpressionReturnType> = {
      stringBuffer: "",
      foundComment: false,
      parts: [],
      matchCounts: initialMatchCounts || {},
    };

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (
        parseContentCharacter(
          state,
          getCharacter,
          parsers,
          c,
          i,
        )
      ) {
        break;
      }
    }

    // Skip comments
    if (state.stringBuffer.startsWith("%")) {
      throw new Error("Skip");
    }

    if (state.stringBuffer) {
      // @ts-expect-error This is fine
      state.parts.push(state.stringBuffer);
    }

    const value = expression(state.parts);

    if (!!value) {
      if (initialMatchCounts) {
        Object.assign(initialMatchCounts, state.matchCounts);
      }

      return value;
    }

    throw new Error("No matching expression was found");
  };
}

function parseContentCharacter<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
  ) => { match: string; value: ExpressionReturnType })[],
  c: string,
  index: number,
) {
  // TODO: Allow also whitespace before a comment
  if (index === 0 && c === "%") {
    state.foundComment = true;
  }

  if (isParagraphBreak(getCharacter, c)) {
    return true;
  }

  if (parseEscapedCharacter(state, getCharacter, c)) {
    return false;
  }

  if (c === "\\" && !state.foundComment) {
    return !parseExpression(state, getCharacter, parsers);
  }

  state.stringBuffer += c === "~" && getCharacter.get() === "\\" ? " " : c;

  return false;
}

function isParagraphBreak(getCharacter: CharacterGenerator, c: string) {
  return c === "\n" && getCharacter.get() === "\n";
}

function parseEscapedCharacter<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (c !== "\\") {
    return false;
  }

  if (getCharacter.get() === "%") {
    state.stringBuffer += "%";
    getCharacter.next();

    return true;
  }

  if (getCharacter.get() === "-") {
    // LaTeX discretionary hyphen. It only marks a possible break point.
    getCharacter.next();

    return true;
  }

  return false;
}

function parseExpression<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
  ) => { match: string; value: ExpressionReturnType })[],
) {
  // @ts-expect-error This is fine
  state.parts.push(state.stringBuffer);
  state.stringBuffer = "";

  getCharacter.previous();

  const parseResult = runParsers<ExpressionReturnType>(
    getCharacter,
    parsers,
    structuredClone(state.matchCounts),
  );

  if (!parseResult) {
    return false;
  }

  // @ts-expect-error There's some type confusion here
  if (parseResult.matchCounts) {
    // @ts-expect-error There's some type confusion here
    state.matchCounts = parseResult.matchCounts;
  }

  // @ts-expect-error There's some type confusion here
  state.parts.push(parseResult.value);

  return true;
}

export { getParseContent };
