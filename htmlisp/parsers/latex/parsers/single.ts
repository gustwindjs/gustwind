import type { CharacterGenerator } from "../../types.ts";
import type { MatchCounts } from "./runParsers.ts";

type SingleParser<ExpressionReturnType> = (
  s: string[],
  matchCounts: MatchCounts,
) => ExpressionReturnType;

const STATES = {
  IDLE: "IDLE",
  PARSE_EXPRESSION: "PARSE_EXPRESSION",
  PARSE_EXPRESSION_CONTENT: "PARSE_EXPRESSION_CONTENT",
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
  return function parseSingle(
    getCharacter: CharacterGenerator,
    matchCounts?: MatchCounts,
  ): { match: string; value: ExpressionReturnType; matchCounts?: MatchCounts } {
    let state: State = STATES.IDLE;
    let foundKey = "";
    const parts: unknown[] = [];
    let stringBuffer = "";

    for (let i = 0; i < LIMIT; i++) {
      const c = getCharacter.next();

      if (c === null) {
        if (state === STATES.PARSE_EXPRESSION && expressions[stringBuffer]) {
          return {
            match: stringBuffer,
            value: expressions[stringBuffer]([], matchCounts || {}),
            matchCounts,
          };
        }

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
            throw new Error("No matching expression was found");
            // throw new Error(`Unknown expression: ${stringBuffer}`);
          }
        } else if (expressions[stringBuffer] && !isCommandNameCharacter(c)) {
          if (c !== " ") {
            getCharacter.previous();
          }

          return {
            match: stringBuffer,
            value: expressions[stringBuffer]([], matchCounts || {}),
            matchCounts,
          };
        } else {
          stringBuffer += c;
        }
      } else if (state === STATES.PARSE_EXPRESSION_CONTENT) {
        if (c === "\\" && ["%", "{", "}"].includes(getCharacter.get() || "")) {
          stringBuffer += getCharacter.get();
          getCharacter.next();
        } else if (c === "\\") {
          const characterIndex = getCharacter.getIndex();

          if (stringBuffer) {
            parts.push(stringBuffer);
            stringBuffer = "";
          }

          getCharacter.previous();

          try {
            const ret = parseSingle(getCharacter, matchCounts);

            if (ret) {
              parts.push(ret.value);
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "No matching expression was found"
            ) {
              getCharacter.setIndex(characterIndex - 1);
              stringBuffer += readLatexCommand(getCharacter);
            } else {
              throw error;
            }
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

    throw new Error("No matching expression was found");
  };
}

function isCommandNameCharacter(value: string) {
  return /[A-Za-z]/.test(value);
}

function readLatexCommand(getCharacter: CharacterGenerator) {
  let ret = "";
  const first = getCharacter.next();

  if (first !== "\\") {
    return first || "";
  }

  ret += first;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return ret;
    }

    if (isCommandNameCharacter(c)) {
      ret += c;
    } else {
      getCharacter.previous();
      break;
    }
  }

  for (let i = 0; i < LIMIT && getCharacter.get() === "{"; i++) {
    ret += readBalancedGroup(getCharacter);
  }

  return ret;
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

export { getParseSingle, type SingleParser };
