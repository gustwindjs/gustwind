import type { CharacterGenerator } from "../../types.ts";
import type { Parse } from "./types.ts";

const STATES = {
  IDLE: 0,
  PARSE_ITEM: 1,
  PARSE_CONTENT: 2,
} as const;
type State = typeof STATES[keyof typeof STATES];

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content following \item
function parseListItem<ExpressionReturnType>(
  { getCharacter, parse }: {
    getCharacter: CharacterGenerator;
    parse?: Parse<ExpressionReturnType>;
  },
) {
  let state: State = STATES.IDLE;
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
          throw new Error("Error: No matching expression was found");
        }

        itemIndex++;
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_CONTENT) {
      const parseResult = parse &&
        parse({ getCharacter });

      if (parseResult?.match) {
        parts.push(stringBuffer);
        stringBuffer = "";

        parts.push(parseResult.value);
      } else {
        stringBuffer += c;
      }

      if (getCharacter.get(1) === "\n") {
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

  throw new Error("Error: No matching expression was found");
}

export { parseListItem };
