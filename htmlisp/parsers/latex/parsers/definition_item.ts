import type { CharacterGenerator } from "../../types.ts";
import type { Parse } from "./types.ts";

const STATES = {
  IDLE: 0,
  PARSE_ITEM: 1,
  PARSE_TITLE: 2,
  PARSE_DESCRIPTION_WHITESPACE: 3,
  PARSE_DESCRIPTION: 4,
} as const;
type State = typeof STATES[keyof typeof STATES];

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content within \item[<key>] <value>
function parseDefinitionItem(
  { getCharacter }: {
    getCharacter: CharacterGenerator;
  },
): { title: string; description: string } {
  let state: State = STATES.IDLE;
  let stringBuffer = "";
  let title = "";
  let description = "";
  let itemIndex = 0;

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      throw new Error("Error: No matching expression was found");
    }

    if (state === STATES.IDLE) {
      if (c === "\\") {
        state = STATES.PARSE_ITEM;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_ITEM) {
      if (c === "[") {
        state = STATES.PARSE_TITLE;
      } else {
        if (ITEM_SYNTAX[itemIndex] !== c) {
          throw new Error("Error: No matching expression was found");
        }

        itemIndex++;
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_TITLE) {
      if (c === "]") {
        state = STATES.PARSE_DESCRIPTION_WHITESPACE;
      } else {
        title += c;
      }
    } else if (state === STATES.PARSE_DESCRIPTION_WHITESPACE) {
      if (c !== " ") {
        getCharacter.previous();

        state = STATES.PARSE_DESCRIPTION;
      }
    } else if (state === STATES.PARSE_DESCRIPTION) {
      if (c === "\n") {
        getCharacter.previous();

        return { title, description };
      }

      description += c;
    }
  }

  throw new Error("Error: No matching expression was found");
}

export { parseDefinitionItem };
