import type { CharacterGenerator } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_EXPRESSION_CONTENT,
}

const LIMIT = 100000;

// Parses \<expression>{<parameter>} form
function getParseSingle<ExpressionReturnType>(
  expressions: Record<
    string,
    (s: string, matchCounts: Record<string, number>) => ExpressionReturnType
  >,
) {
  return function parseSingle(
    getCharacter: CharacterGenerator,
    matchCounts?: Record<string, number>,
  ): { match: string; value: ExpressionReturnType } {
    let state = STATES.IDLE;
    let foundKey = "";
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
            state = STATES.PARSE_EXPRESSION_CONTENT;
          } else {
            throw new Error(`Unknown expression: ${stringBuffer}`);
          }
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_CONTENT) {
        if (c === "\\") {
          getCharacter.previous();
          const ret = parseSingle(getCharacter, matchCounts);

          if (ret) {
            // TODO: Find a better way to handle this
            // @ts-expect-error Nasty but works
            stringBuffer = ret.value;
          }
        } else if (c === "}") {
          return {
            match: foundKey,
            value: expressions[foundKey](stringBuffer, matchCounts || {}),
          };
        } else {
          stringBuffer += c;
        }
      }
    }

    throw new Error("No matching expression was found");
  };
}

export { getParseSingle };
