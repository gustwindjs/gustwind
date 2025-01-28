import type { CharacterGenerator } from "../../types.ts";
import type { MatchCounts } from "./types.ts";

type SingleParser<ExpressionReturnType> = (
  s: string[],
  matchCounts: MatchCounts,
) => ExpressionReturnType;

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
    SingleParser<ExpressionReturnType>
  >,
) {
  return function parseSingle({ getCharacter, matchCounts }: {
    getCharacter: CharacterGenerator;
    matchCounts: MatchCounts;
  }): {
    match: string;
    value: ExpressionReturnType;
    matchCounts: MatchCounts;
  } {
    let state = STATES.IDLE;
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
            getCharacter.previous();
            throw new Error("No matching expression was found");
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

          const ret = parseSingle({ getCharacter, matchCounts });

          if (ret) {
            parts.push(ret.value);
          }
        } else if (c === "}") {
          if (stringBuffer) {
            parts.push(stringBuffer);
          }

          if (matchCounts) {
            if (!matchCounts[foundKey]) {
              matchCounts[foundKey] = [];
            }

            stringBuffer.split(",").forEach((s) => {
              matchCounts[foundKey].push(s.trim());
            });
          }

          getCharacter.previous();
          return {
            match: foundKey,
            value: expressions[foundKey](parts as string[], matchCounts || {}),
            matchCounts,
          };
        } else {
          stringBuffer += c;
        }
      }
    }

    getCharacter.previous();
    throw new Error("No matching expression was found");
  };
}

export { getParseSingle, type SingleParser };
