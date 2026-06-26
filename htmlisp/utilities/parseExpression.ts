import { getMemo } from "../../utilities/getMemo.ts";
import type { Utility } from "../../types.ts";

type ParseState = {
  ret: Utility | undefined;
  parents: Utility[];
  parent: Utility | undefined;
  parameterIndex: number;
  segment: string;
  captureEmpty: boolean;
  level: number;
};

const memo = getMemo(new Map());
function cachedParseExpression(input: string) {
  return memo(parseExpression, input);
}

function parseExpression(s: string) {
  // TODO: Test \n case
  const characters = s.replaceAll("\n", "").split("");
  const state: ParseState = {
    ret: undefined,
    parents: [],
    parent: undefined,
    parameterIndex: 0,
    segment: "",
    captureEmpty: false,
    level: 0,
  };

  characters.forEach((character) => {
    if (startNestedExpression(state, character)) {
      return;
    }

    const captureSegment = consumeCharacter(state, character);

    if (captureSegment) {
      captureSegmentValue(state, s);
    }
  });

  return state.ret;
}

function startNestedExpression(state: ParseState, character: string) {
  if (character !== "(" || state.captureEmpty) {
    return false;
  }

  // Note that the implementation avoids recursion on purpose and parent
  // tracking is handled through references.
  const template = { utility: "", parameters: [] };

  state.parent?.parameters?.push(template);
  state.parent = template;
  state.parents.push(template);
  state.parameterIndex = 0;
  state.level++;

  if (!state.ret) {
    state.ret = state.parents.at(-1);
  }

  return true;
}

function consumeCharacter(state: ParseState, character: string) {
  if (isExpressionEnd(state, character)) {
    state.level--;

    return true;
  }

  if (character === "'") {
    return consumeQuote(state);
  }

  if (isUnquotedSpace(state, character)) {
    return true;
  }

  state.segment += character;

  return false;
}

function isExpressionEnd(state: ParseState, character: string) {
  return character === ")" && !state.captureEmpty;
}

function isUnquotedSpace(state: ParseState, character: string) {
  return character === " " && !state.captureEmpty;
}

function consumeQuote(state: ParseState) {
  if (state.captureEmpty) {
    state.captureEmpty = false;

    return true;
  }

  state.captureEmpty = true;

  return false;
}

function captureSegmentValue(state: ParseState, source: string) {
  if (!state.parent) {
    throw new Error(`Missing parent at ${source}`);
  }

  if (state.parameterIndex === 0) {
    state.parent.utility = state.segment;
    state.parameterIndex++;
  } else if (state.segment.length > 0) {
    state.parent.parameters?.push(state.segment);
  }

  closeCompletedParent(state);
  state.segment = "";
}

function closeCompletedParent(state: ParseState) {
  if (state.parents.length - state.level > 0 && state.parents.length > 1) {
    state.parents.pop();
    state.parent = state.parents.at(-1);
  }
}

export { cachedParseExpression as parseExpression };
