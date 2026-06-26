import type { CharacterGenerator } from "../../types.ts";

type DoubleParser<ExpressionReturnType> = (
  s: string,
  arg: string,
) => ExpressionReturnType;

const STATES = {
  IDLE: "IDLE",
  PARSE_EXPRESSION: "PARSE_EXPRESSION",
  PARSE_EXPRESSION_FIRST: "PARSE_EXPRESSION_FIRST",
  PARSE_EXPRESSION_SECOND: "PARSE_EXPRESSION_SECOND",
} as const;
type State = typeof STATES[keyof typeof STATES];
type DoubleParseState = {
  state: State;
  foundKey: string;
  foundFirst: string;
  stringBuffer: string;
  bracesFound: number;
};

const LIMIT = 100000;

// Parses \<expression>{<parameter 1>}{<parameter 2>} form
function getParseDouble<ExpressionReturnType>(
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
) {
  return function parseDouble(
    getCharacter: CharacterGenerator,
  ): { match: string; value: ExpressionReturnType } {
    const parseState: DoubleParseState = {
      state: STATES.IDLE,
      foundKey: "",
      foundFirst: "",
      stringBuffer: "",
      bracesFound: 0,
    };

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      const result = parseDoubleCharacter(
        parseState,
        getCharacter,
        expressions,
        c,
        i,
      );

      if (result) {
        return result;
      }
    }

    throw new Error("No matching expression was found");
  };
}

function parseDoubleCharacter<ExpressionReturnType>(
  parseState: DoubleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
  c: string,
  index: number,
) {
  return doubleStateParsers[parseState.state](
    parseState,
    getCharacter,
    expressions,
    c,
    index,
  );
}

const doubleStateParsers = {
  [STATES.IDLE]: <ExpressionReturnType>(
    parseState: DoubleParseState,
    _getCharacter: CharacterGenerator,
    _expressions: Record<string, DoubleParser<ExpressionReturnType>>,
    c: string,
    index: number,
  ) => parseIdle(parseState, c, index),
  [STATES.PARSE_EXPRESSION]: <ExpressionReturnType>(
    parseState: DoubleParseState,
    _getCharacter: CharacterGenerator,
    expressions: Record<string, DoubleParser<ExpressionReturnType>>,
    c: string,
  ) => parseExpressionName(parseState, expressions, c),
  [STATES.PARSE_EXPRESSION_FIRST]: (
    parseState: DoubleParseState,
    getCharacter: CharacterGenerator,
    _expressions: unknown,
    c: string,
  ) => parseFirstArgument(parseState, getCharacter, c),
  [STATES.PARSE_EXPRESSION_SECOND]: <ExpressionReturnType>(
    parseState: DoubleParseState,
    getCharacter: CharacterGenerator,
    expressions: Record<string, DoubleParser<ExpressionReturnType>>,
    c: string,
  ) => parseSecondArgument(parseState, getCharacter, expressions, c),
};

function parseIdle(
  parseState: DoubleParseState,
  c: string,
  index: number,
) {
  if (c === "\\") {
    if (index !== 0) {
      throw new Error("No matching expression was found");
    }

    parseState.stringBuffer = "";
    parseState.state = STATES.PARSE_EXPRESSION;
  } else {
    parseState.stringBuffer += c;
  }
}

function parseExpressionName<ExpressionReturnType>(
  parseState: DoubleParseState,
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
  c: string,
) {
  if (c !== "{") {
    parseState.stringBuffer += c;

    return;
  }

  if (!expressions[parseState.stringBuffer]) {
    throw new Error("No matching expression was found");
    // throw new Error(`Unknown expression: ${parseState.stringBuffer}`);
  }

  parseState.foundKey = parseState.stringBuffer;
  parseState.stringBuffer = "";
  parseState.state = STATES.PARSE_EXPRESSION_FIRST;
}

function parseFirstArgument(
  parseState: DoubleParseState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (parseEscapedPercent(parseState, getCharacter, c)) {
    return;
  }

  if (c !== "}") {
    parseState.stringBuffer += c;

    return;
  }

  parseState.foundFirst = parseState.stringBuffer;

  if (getCharacter.get() !== "{") {
    throw new Error("No matching expression was found");
    // throw new Error("Argument was missing");
  }

  parseState.stringBuffer = "";
  parseState.state = STATES.PARSE_EXPRESSION_SECOND;
  getCharacter.next();
}

function parseSecondArgument<ExpressionReturnType>(
  parseState: DoubleParseState,
  getCharacter: CharacterGenerator,
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
  c: string,
) {
  if (parseEscapedPercent(parseState, getCharacter, c)) {
    parseState.stringBuffer += c;

    return;
  }

  const result = parseSecondArgumentBrace(parseState, expressions, c);

  parseState.stringBuffer += c;

  return result;
}

function parseSecondArgumentBrace<ExpressionReturnType>(
  parseState: DoubleParseState,
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
  c: string,
) {
  if (c === "{") {
    parseState.bracesFound++;

    return;
  }

  return c === "}" ? parseSecondArgumentClosingBrace(parseState, expressions) : undefined;
}

function parseSecondArgumentClosingBrace<ExpressionReturnType>(
  parseState: DoubleParseState,
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
) {
  if (parseState.bracesFound) {
    parseState.bracesFound--;

    return;
  }

  return {
    match: parseState.foundKey,
    value: expressions[parseState.foundKey](
      parseState.foundFirst,
      parseState.stringBuffer,
    ),
  };
}

function parseEscapedPercent(
  parseState: DoubleParseState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (c !== "\\" || getCharacter.get() !== "%") {
    return false;
  }

  parseState.stringBuffer += "%";
  getCharacter.next();

  return true;
}

export { type DoubleParser, getParseDouble };
