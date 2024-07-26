import type { CharacterGenerator } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_FIRST,
  PARSE_EXPRESSION_SECOND,
}

const LIMIT = 100000;

// Parses \<expression>{<parameter 1>}{<parameter 2>} form
function getParseDouble<ExpressionReturnType>(
  expressions: Record<string, (s: string, arg: string) => ExpressionReturnType>,
) {
  return function parseDouble(
    getCharacter: CharacterGenerator,
  ): ExpressionReturnType {
    let state = STATES.IDLE;
    let foundKey = "";
    let foundFirst = "";
    let stringBuffer = "";

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (state === STATES.IDLE) {
        if (c === "\\") {
          if (i !== 0) {
            throw new Error("No matching expression was found");
          }

          stringBuffer = "";
          state = STATES.PARSE_EXPRESSION;
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION) {
        if (c === "{") {
          if (expressions[stringBuffer]) {
            foundKey = stringBuffer;
            stringBuffer = "";
            state = STATES.PARSE_EXPRESSION_FIRST;
          } else {
            throw new Error(`Unknown expression: ${stringBuffer}`);
          }
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_FIRST) {
        if (c === "}") {
          foundFirst = stringBuffer;
        } else if (c === "{") {
          stringBuffer = "";
          state = STATES.PARSE_EXPRESSION_SECOND;
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_SECOND) {
        if (c === "}") {
          return expressions[foundKey](foundFirst, stringBuffer);
        } else {
          stringBuffer += c;
        }
      }
    }

    throw new Error("No matching expression was found");
  };
}

export { getParseDouble };
