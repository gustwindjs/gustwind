import * as states from "./states.ts";
import { parseAttributeName, parseAttributeValue } from "./parseAttribute.ts";
// import { parseChildren } from './parseChildren.ts' // TODO
// import { parseIdle } from './parseIdle.ts' // TODO
import { parseTagEnd, parseTagStart } from "./parseTag.ts";

const STATE_PARSERS = {
  // CAPTURE_ATTRIBUTE: captureAttribute,
  // IDLE: parseIdle,
  PARSE_ATTRIBUTE_NAME: parseAttributeName,
  PARSE_ATTRIBUTE_VALUE: parseAttributeValue,
  // PARSE_CHILDREN: parseChildren,
  PARSE_TAG_END: parseTagEnd,
  PARSE_TAG_START: parseTagStart,
};

function evaluate(input: string) {
  // const currentState = parseIdle()

  for (let i = 0; i < input.length; i++) {
    // TODO: Evaluate states while capturing AST

    // TODO: Figure out a good interface here
    // const { value, state } = currentState.next();
  }
}

export { evaluate };
