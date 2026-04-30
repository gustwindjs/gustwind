import type { CharacterGenerator } from "../../types.ts";

const STATES = {
  IDLE: "IDLE",
  PARSE_ITEM: "PARSE_ITEM",
  PARSE_CONTENT: "PARSE_CONTENT",
} as const;
type State = typeof STATES[keyof typeof STATES];

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content following \item
function parseListItem(
  getCharacter: CharacterGenerator,
): string {
  let state: State = STATES.IDLE;
  let stringBuffer = "";
  let itemIndex = 0;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return stringBuffer;
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
      if (c === "\n") {
        return stringBuffer;
      }

      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseListItem };
