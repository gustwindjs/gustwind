import type { CharacterGenerator } from "../../types.ts";
import { type MatchCounts, runParsers } from "./runParsers.ts";

type SingleParser<ExpressionReturnType> = (
  s: string[],
  matchCounts: MatchCounts,
) => ExpressionReturnType;

const STATES = {
  IDLE: "IDLE",
  PARSE_EXPRESSION: "PARSE_EXPRESSION",
  PARSE_EXPRESSION_CONTENT: "PARSE_EXPRESSION_CONTENT",
} as const;
type State = (typeof STATES)[keyof typeof STATES];
type SingleParseState = {
  state: State;
  foundKey: string;
  parts: unknown[];
  stringBuffer: string;
};

const LIMIT = 100000;

// Parses \<expression>{<parameter>} form
function getParseSingle<ExpressionReturnType>(
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  nestedParsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[] = [],
) {
  return function parseSingle(
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ): { match: string; value: ExpressionReturnType; matchCounts?: MatchCounts } {
    const parseState: SingleParseState = {
      state: STATES.IDLE,
      foundKey: "",
      parts: [],
      stringBuffer: "",
    };

    for (let i = 0; i < LIMIT; i++) {
      const characterResult = parseSingleNextCharacter(
        parseState,
        getCharacter,
        expressions,
        [parseSingle, ...nestedParsers],
        matchCounts,
        i,
      );

      if (characterResult.matchCounts) {
        matchCounts = characterResult.matchCounts;
      }

      if (characterResult.result) {
        return characterResult.result;
      }
    }

    throw new Error("No matching expression was found");
  };
}

function parseSingleNextCharacter<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
  index: number,
) {
  const c = getCharacter.next();

  if (c === null) {
    return {
      matchCounts: undefined,
      result: handleSingleParserEnd(parseState, expressions, matchCounts),
    };
  }

  return applySingleParseResult(
    parseSingleCharacter(
      parseState,
      getCharacter,
      expressions,
      parsers,
      matchCounts,
      c,
      index,
    ),
  );
}

function handleSingleParserEnd<ExpressionReturnType>(
  parseState: SingleParseState,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  matchCounts?: MatchCounts,
) {
  const emptyResult = getEmptyExpressionResult(
    parseState,
    expressions,
    matchCounts,
  );

  if (emptyResult) {
    return emptyResult;
  }

  throw new Error("No matching expression was found");
}

function applySingleParseResult<ExpressionReturnType>(parseResult: {
  result?: {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  };
  matchCounts?: MatchCounts;
}) {
  return {
    matchCounts: parseResult.matchCounts,
    result: parseResult.result,
  };
}

function getEmptyExpressionResult<ExpressionReturnType>(
  parseState: SingleParseState,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  matchCounts?: MatchCounts,
) {
  if (
    parseState.state !== STATES.PARSE_EXPRESSION ||
    !expressions[parseState.stringBuffer]
  ) {
    return;
  }

  return {
    match: parseState.stringBuffer,
    value: expressions[parseState.stringBuffer]([], matchCounts || {}),
    matchCounts,
  };
}

function parseSingleCharacter<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
  c: string,
  index: number,
): {
  result?: {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  };
  matchCounts?: MatchCounts;
} {
  if (parseState.state === STATES.IDLE) {
    parseIdle(parseState, c, index);

    return {};
  }

  if (parseState.state === STATES.PARSE_EXPRESSION) {
    return {
      result: parseExpressionName(
        parseState,
        getCharacter,
        expressions,
        matchCounts,
        c,
      ),
    };
  }

  return parseExpressionContent(
    parseState,
    getCharacter,
    expressions,
    parsers,
    matchCounts,
    c,
  );
}

function parseIdle(parseState: SingleParseState, c: string, index: number) {
  if (c !== "\\") {
    parseState.stringBuffer += c;

    return;
  }

  if (index !== 0) {
    throw new Error("No matching expression was found");
  }

  parseState.stringBuffer = "";
  parseState.state = STATES.PARSE_EXPRESSION;
}

function parseExpressionName<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  matchCounts: MatchCounts | undefined,
  c: string,
) {
  if (c === "{") {
    startExpressionContent(parseState, expressions);

    return;
  }

  if (isStandaloneExpressionEnd(parseState, expressions, c)) {
    return finishStandaloneExpression(
      parseState,
      getCharacter,
      expressions,
      matchCounts,
      c,
    );
  }

  parseState.stringBuffer += c;
}

function isStandaloneExpressionEnd<ExpressionReturnType>(
  parseState: SingleParseState,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  c: string,
) {
  return (
    Boolean(expressions[parseState.stringBuffer]) && !isCommandNameCharacter(c)
  );
}

function finishStandaloneExpression<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  matchCounts: MatchCounts | undefined,
  c: string,
) {
  if (c !== " ") {
    getCharacter.previous();
  }

  return {
    match: parseState.stringBuffer,
    value: expressions[parseState.stringBuffer]([], matchCounts || {}),
    matchCounts,
  };
}

function startExpressionContent<ExpressionReturnType>(
  parseState: SingleParseState,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
) {
  if (!expressions[parseState.stringBuffer]) {
    throw new Error("No matching expression was found");
    // throw new Error(`Unknown expression: ${parseState.stringBuffer}`);
  }

  parseState.foundKey = parseState.stringBuffer;
  parseState.stringBuffer = "";
  parseState.state = STATES.PARSE_EXPRESSION_CONTENT;
}

function parseExpressionContent<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
  c: string,
) {
  if (parseEscapedContentCharacter(parseState, getCharacter, c)) {
    return {};
  }

  if (c === "\\") {
    return parseNestedExpression(
      parseState,
      getCharacter,
      parsers,
      matchCounts,
    );
  }

  if (c === "}") {
    return {
      result: finishExpression(parseState, expressions, matchCounts),
    };
  }

  parseState.stringBuffer += c;

  return {};
}

function parseEscapedContentCharacter(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (!isEscapedContentCharacter(getCharacter, c)) {
    return false;
  }

  parseState.stringBuffer += getCharacter.get();
  getCharacter.next();

  return true;
}

function isEscapedContentCharacter(
  getCharacter: CharacterGenerator,
  c: string,
) {
  return c === "\\" && ["%", "{", "}"].includes(getCharacter.get() || "");
}

function parseNestedExpression<ExpressionReturnType>(
  parseState: SingleParseState,
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
) {
  const characterIndex = getCharacter.getIndex();

  flushStringBuffer(parseState);
  getCharacter.previous();

  const parseResult = parseNestedExpressionResult(
    getCharacter,
    parsers,
    matchCounts,
  );

  if (parseResult) {
    parseState.parts.push(parseResult.value);

    return { matchCounts: parseResult.matchCounts };
  }

  getCharacter.setIndex(characterIndex - 1);
  parseState.stringBuffer += readLatexCommand(getCharacter);

  return {};
}

function parseNestedExpressionResult<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
) {
  return asNestedExpressionResult(
    runNestedExpressionParsers(getCharacter, parsers, matchCounts),
  );
}

function runNestedExpressionParsers<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
  parsers: ((
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ) => {
    match: string;
    value: ExpressionReturnType;
    matchCounts?: MatchCounts;
  })[],
  matchCounts: MatchCounts | undefined,
) {
  try {
    return runParsers(getCharacter, parsers, matchCounts);
  } catch (error) {
    handleNestedExpressionError(error);
  }
}

function handleNestedExpressionError(error: unknown) {
  if (!isUnknownExpressionError(error)) {
    throw error;
  }
}

function asNestedExpressionResult<ExpressionReturnType>(
  parseResult:
    | {
      match: string | boolean;
      value?: ExpressionReturnType;
      matchCounts?: MatchCounts;
    }
    | undefined,
) {
  return parseResult &&
      typeof parseResult.match === "string" &&
      "value" in parseResult
    ? parseResult
    : undefined;
}

function finishExpression<ExpressionReturnType>(
  parseState: SingleParseState,
  expressions: Record<string, SingleParser<ExpressionReturnType>>,
  matchCounts: MatchCounts | undefined,
) {
  flushStringBuffer(parseState);
  updateMatchCounts(parseState, matchCounts);

  return {
    match: parseState.foundKey,
    value: expressions[parseState.foundKey](
      parseState.parts as string[],
      matchCounts || {},
    ),
    matchCounts,
  };
}

function flushStringBuffer(parseState: SingleParseState) {
  if (!parseState.stringBuffer) {
    return;
  }

  parseState.parts.push(parseState.stringBuffer);
  parseState.stringBuffer = "";
}

function updateMatchCounts(
  parseState: SingleParseState,
  matchCounts?: MatchCounts,
) {
  if (!matchCounts) {
    return;
  }

  if (!matchCounts[parseState.foundKey]) {
    matchCounts[parseState.foundKey] = [];
  }

  partsToText(parseState.parts)
    .split(",")
    .forEach((s) => {
      matchCounts[parseState.foundKey].push(s.trim());
    });
}

function isUnknownExpressionError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === "No matching expression was found"
  );
}

function isCommandNameCharacter(value: string) {
  return /[A-Za-z]/.test(value);
}

function readLatexCommand(getCharacter: CharacterGenerator) {
  const first = getCharacter.next();

  if (!startsLatexCommand(first)) {
    return first || "";
  }

  return (
    first + readCommandName(getCharacter) + readCommandArguments(getCharacter)
  );
}

function readCommandName(getCharacter: CharacterGenerator) {
  let ret = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return ret;
    }

    if (!isCommandNameCharacter(c)) {
      getCharacter.previous();
      break;
    }

    ret += c;
  }

  return ret;
}

function readCommandArguments(getCharacter: CharacterGenerator) {
  let ret = "";

  for (let i = 0; i < LIMIT && getCharacter.get() === "{"; i++) {
    ret += readBalancedGroup(getCharacter);
  }

  return ret;
}

function startsLatexCommand(value: string | null) {
  return value === "\\";
}

function readBalancedGroup(getCharacter: CharacterGenerator) {
  let ret = "";
  let depth = 0;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return ret;
    }

    ret += c;

    const nextDepth = getNextGroupDepth(depth, c);

    if (isBalancedGroupEnd(nextDepth, c)) {
      return ret;
    }

    depth = nextDepth;
  }

  return ret;
}

function getNextGroupDepth(depth: number, c: string) {
  if (c === "{") {
    return depth + 1;
  }

  return c === "}" ? depth - 1 : depth;
}

function isBalancedGroupEnd(depth: number, c: string) {
  return c === "}" && depth === 0;
}

function partsToText(parts: unknown[]): string {
  return parts.map(partToText).join("");
}

function partToText(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }

  if (hasTextChildren(part)) {
    return partsToText(part.children || []);
  }

  return "";
}

function hasTextChildren(part: unknown): part is { children?: unknown[] } {
  return Boolean(part && typeof part === "object" && "children" in part);
}

export { getParseSingle, type SingleParser };
