import type { CharacterGenerator } from "../types.ts";
import type { Expression } from "./expressions.ts";
import type { Element } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_CONTENT,
  PARSE_BLOCK_START,
  PARSE_BLOCK_CONTENT,
  PARSE_BLOCK_END,
}

const LIMIT = 100000;

// TODO: Where to handle paragraphs?

// TODO: This should run subparsers somehow
function parse(
  // TODO: This might be too specific - maybe it's better to split
  // up subparsers per type and pass the parsers here instead
  expressions: {
    singles: Expression[];
    doubles: Expression[];
    blocks: Expression[];
  },
  getCharacter: CharacterGenerator,
): Element[] {
  let output = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return [{ type: "p", attributes: {}, children: [output] }];
}

// Parses \<expression>{<parameter>} form
function parseSingle(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element[] {
  let state = STATES.IDLE;
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (c === "\\") {
        if (stringBuffer) {
          /*
          const tag = {
            type: "p",
            attributes: {},
            children: [stringBuffer],
          };
          ret.push(tag);
          currentTag = tag;
          */
        }

        stringBuffer = "";
        state = STATES.PARSE_EXPRESSION;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_EXPRESSION) {
      if (c === "{") {
        if (Object.keys(expressions).includes(stringBuffer)) {
          stringBuffer = "";
          state = STATES.PARSE_EXPRESSION_CONTENT;
        } else {
          throw new Error(`Unknown expression: ${stringBuffer}`);
        }
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_EXPRESSION_CONTENT) {
      // TODO: Adjust this to fit - likely the functionality should be inlined here
      /*
      const o = parseExpression(c, currentTag, stringBuffer, "a", {
        href: stringBuffer,
      });

      stringBuffer = o.stringBuffer;
      if (o.state) {
        state = o.state;
      }
      */
      if (c === "}") {
        // TODO: Call match logic and generate an element to return
        // Likely this should return here
      }
    }
  }

  // TODO: Likely this code should never be reached. If reached, then it should throw
  return [{ type: "p", attributes: {}, children: [stringBuffer] }];
}

// Parses \<expression>{<parameter1>}{<parameter2>} form
function parseDouble(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element[] {
  let output = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return [{ type: "p", attributes: {}, children: [output] }];
}

// Parses \begin{<type>}...\end{<type>} form
function parseBlock(
  expressions: Record<string, Expression>,
  getCharacter: CharacterGenerator,
): Element[] {
  let output = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    output += c;
  }

  return [{ type: "p", attributes: {}, children: [output] }];
}

export { parse, parseBlock, parseDouble, parseSingle };
