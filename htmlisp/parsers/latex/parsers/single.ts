import type { CharacterGenerator } from "../../types.ts";

type SingleParser<ExpressionReturnType> = (
  s: string[],
) => ExpressionReturnType;

const STATES = {
  IDLE: 0,
  PARSE_EXPRESSION: 1,
  PARSE_EXPRESSION_CONTENT: 2,
} as const;
type State = typeof STATES[keyof typeof STATES];

const LIMIT = 100000;

// Parses \<expression>{<parameter>} form
function getParseSingle<ExpressionReturnType>(
  expressions: Record<
    string,
    SingleParser<ExpressionReturnType>
  >,
) {
  return function parseSingle({ getCharacter }: {
    getCharacter: CharacterGenerator;
  }): {
    match: string;
    value: ExpressionReturnType;
  } {
    let state: State = STATES.IDLE;
    let foundKey = "";
    const parts: unknown[] = [];
    let stringBuffer = "";

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (state === STATES.IDLE) {
        if (c === "\\") {
          if (i !== 0) {
            getCharacter.previous();
            throw new Error("Error: No matching expression was found");
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
            getCharacter.previous();
            throw new Error("Error: No matching expression was found");
            // throw new Error(`Unknown expression: ${stringBuffer}`);
          }
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_CONTENT) {
        if (c === "\\") {
          if (stringBuffer) {
            parts.push(stringBuffer);
            stringBuffer = "";
          }

          getCharacter.previous();

          const ret = parseSingle({ getCharacter });

          if (ret) {
            parts.push(ret.value);
          }
        } else if (c === "}") {
          if (stringBuffer) {
            parts.push(stringBuffer);
          }

          getCharacter.previous();
          return {
            match: foundKey,
            value: expressions[foundKey](parts as string[]),
          };
        } else {
          stringBuffer += c;
        }
      }
    }

    getCharacter.previous();
    throw new Error("Error: No matching expression was found");
  };
}

export { getParseSingle, type SingleParser };
