import type { CharacterGenerator } from "../../types.ts";
import type { MatchCounts, Parse } from "./types.ts";

enum STATES {
  IDLE,
  PARSE_ITEM,
  PARSE_CONTENT,
}

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content following \item
function parseListItem<ExpressionReturnType>(
  { getCharacter, matchCounts, parse }: {
    getCharacter: CharacterGenerator;
    matchCounts: MatchCounts;
    parse?: Parse<ExpressionReturnType>;
  },
) {
  let state = STATES.IDLE;
  let stringBuffer = "";
  const parts: (string | ExpressionReturnType)[] = [];
  let itemIndex = 0;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.get();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (c === "\\") {
        state = STATES.PARSE_ITEM;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_ITEM) {
      if (c === " ") {
        stringBuffer = "";
        state = STATES.PARSE_CONTENT;
      } else {
        if (ITEM_SYNTAX[itemIndex] !== c) {
          throw new Error("No matching expression was found");
        }

        itemIndex++;
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_CONTENT) {
      const parseResult = parse &&
        parse({ getCharacter, matchCounts: structuredClone(matchCounts) });

      if (parseResult?.match) {
        parts.push(stringBuffer);
        stringBuffer = "";

        if (parseResult.matchCounts) {
          matchCounts = parseResult.matchCounts;
        }

        parts.push(parseResult.value);
      } else {
        stringBuffer += c;
      }

      if (c === "\n") {
        break;
      }
    }

    getCharacter.next();
  }

  if (stringBuffer) {
    parts.push(stringBuffer);
  }

  if (parts.length) {
    return parts;
  }

  throw new Error("No matching expression was found");
}

export { parseListItem };
