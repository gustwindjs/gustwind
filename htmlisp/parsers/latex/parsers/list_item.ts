import type { CharacterGenerator } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_ITEM,
  PARSE_CONTENT,
}

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content following \item
function parseListItem(
  getCharacter: CharacterGenerator,
): { match: boolean; value: string } {
  let state = STATES.IDLE;
  let stringBuffer = "";
  let itemIndex = 0;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return { match: true, value: stringBuffer };
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
        return { match: true, value: stringBuffer };
      }

      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseListItem };
