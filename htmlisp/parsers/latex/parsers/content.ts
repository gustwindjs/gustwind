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
  parsers: ((getCharacter: CharacterGenerator) => {
    match: string;
    value: ExpressionReturnType;
  })[] = [],
) {
  return function parseContent(
    getCharacter: CharacterGenerator,
    initialMatchCounts?: MatchCounts,
  ): ExpressionReturnType {
    const state =
      createParseContentState<ExpressionReturnType>(initialMatchCounts);

    collectContentParts(state, getCharacter, parsers);

    return finishContentParse(state, expression, initialMatchCounts);
  };
}

function createParseContentState<ExpressionReturnType>(
  matchCounts?: MatchCounts,
): ParseContentState<ExpressionReturnType> {
  return {
    stringBuffer: "",
    foundComment: false,
    parts: [],
    matchCounts: matchCounts || {},
  };
}

function collectContentParts<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  parsers: ((getCharacter: CharacterGenerator) => {
    match: string;
    value: ExpressionReturnType;
  })[],
) {
  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (parseContentCharacter(state, getCharacter, parsers, c, i)) {
      break;
    }
  }
}

function finishContentParse<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  expression: (
    parts: ExpressionReturnType[],
  ) => ExpressionReturnType | undefined,
  initialMatchCounts?: MatchCounts,
) {
  // Skip comments
  if (state.stringBuffer.startsWith("%")) {
    throw new Error("Skip");
  }

  if (state.stringBuffer) {
    // @ts-expect-error This is fine
    state.parts.push(state.stringBuffer);
  }

  const value = expression(state.parts);

  if (!value) {
    throw new Error("No matching expression was found");
  }

  if (initialMatchCounts) {
    Object.assign(initialMatchCounts, state.matchCounts);
  }

  return value;
}

function parseContentCharacter<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  parsers: ((getCharacter: CharacterGenerator) => {
    match: string;
    value: ExpressionReturnType;
  })[],
  c: string,
  index: number,
) {
  // TODO: Allow also whitespace before a comment
  markCommentStart(state, c, index);

  if (isParagraphBreak(getCharacter, c)) {
    return true;
  }

  if (parseEscapedCharacter(state, getCharacter, c)) {
    return false;
  }

  if (shouldParseExpression(state, c)) {
    return !parseExpression(state, getCharacter, parsers);
  }

  appendContentCharacter(state, getCharacter, c);

  return false;
}

function markCommentStart<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  c: string,
  index: number,
) {
  if (index === 0 && c === "%") {
    state.foundComment = true;
  }
}

function shouldParseExpression<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  c: string,
) {
  return c === "\\" && !state.foundComment;
}

function appendContentCharacter<ExpressionReturnType>(
  state: ParseContentState<ExpressionReturnType>,
  getCharacter: CharacterGenerator,
  c: string,
) {
  state.stringBuffer += c === "~" && getCharacter.get() === "\\" ? " " : c;
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
  parsers: ((getCharacter: CharacterGenerator) => {
    match: string;
    value: ExpressionReturnType;
  })[],
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
