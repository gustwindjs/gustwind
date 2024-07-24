import type { CharacterGenerator } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_ITEM,
  PARSE_CONTENT,
}

const LIMIT = 100000;

// Parses the content following \item
function parseListItem(
  getCharacter: CharacterGenerator,
): string {
  let state = STATES.IDLE;
  let stringBuffer = "";

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
