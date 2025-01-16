import type { CharacterGenerator } from "../../types.ts";

type DoubleParser<ExpressionReturnType> = (
  s: string,
  arg: string,
) => ExpressionReturnType;

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_FIRST,
  PARSE_EXPRESSION_SECOND,
}

const LIMIT = 100000;

// Parses \<expression>{<parameter 1>}{<parameter 2>} form
function getParseDouble<ExpressionReturnType>(
  expressions: Record<string, DoubleParser<ExpressionReturnType>>,
) {
  return function parseDouble(
    getCharacter: CharacterGenerator,
  ): { match: string; value: ExpressionReturnType } {
    let state = STATES.IDLE;
    let foundKey = "";
    let foundFirst = "";
    let stringBuffer = "";
    let bracesFound = 0;

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
            throw new Error("No matching expression was found");
            // throw new Error(`Unknown expression: ${stringBuffer}`);
          }
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_FIRST) {
        if (c === "}") {
          foundFirst = stringBuffer;

          if (getCharacter.get() === "{") {
            stringBuffer = "";
            state = STATES.PARSE_EXPRESSION_SECOND;
            getCharacter.next();
          } else {
            throw new Error("No matching expression was found");
            // throw new Error("Argument was missing");
          }
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_SECOND) {
        if (c === "{") {
          bracesFound++;
        } else if (c === "}") {
          if (bracesFound) {
            bracesFound--;
          } else {
            return {
              match: foundKey,
              value: expressions[foundKey](foundFirst, stringBuffer),
            };
          }
        }

        stringBuffer += c;
      }
    }

    throw new Error("No matching expression was found");
  };
}

export { type DoubleParser, getParseDouble };
