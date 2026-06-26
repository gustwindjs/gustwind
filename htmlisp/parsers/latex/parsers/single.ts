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
      const c = getCharacter.next();

      if (c === null) {
        const emptyResult = getEmptyExpressionResult(
          parseState,
          expressions,
          matchCounts,
        );

        if (emptyResult) {
          return emptyResult;
        }

        break;
      }

      const parseResult = parseSingleCharacter(
        parseState,
        getCharacter,
        expressions,
        [parseSingle, ...nestedParsers],
        matchCounts,
        c,
        i,
      );

      if (parseResult.matchCounts) {
        matchCounts = parseResult.matchCounts;
      }

      if (parseResult.result) {
        return parseResult.result;
      }
    }

    throw new Error("No matching expression was found");
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

  if (expressions[parseState.stringBuffer] && !isCommandNameCharacter(c)) {
    if (c !== " ") {
      getCharacter.previous();
    }

    return {
      match: parseState.stringBuffer,
      value: expressions[parseState.stringBuffer]([], matchCounts || {}),
      matchCounts,
    };
  }

  parseState.stringBuffer += c;
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
  if (c === "\\" && ["%", "{", "}"].includes(getCharacter.get() || "")) {
    parseState.stringBuffer += getCharacter.get();
    getCharacter.next();

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

  try {
    const parseResult = runParsers(getCharacter, parsers, matchCounts);

    if (parseResult && typeof parseResult.match === "string") {
      parseState.parts.push(parseResult.value);

      return { matchCounts: parseResult.matchCounts };
    }
  } catch (error) {
    if (!isUnknownExpressionError(error)) {
      throw error;
    }
  }

  getCharacter.setIndex(characterIndex - 1);
  parseState.stringBuffer += readLatexCommand(getCharacter);

  return {};
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

    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;

      if (depth === 0) {
        return ret;
      }
    }
  }

  return ret;
}

function partsToText(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object" && "children" in part) {
        return partsToText((part as { children?: unknown[] }).children || []);
      }

      return "";
    })
    .join("");
}

export { getParseSingle, type SingleParser };
