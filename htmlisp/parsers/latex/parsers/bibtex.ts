import type { CharacterGenerator } from "../../types.ts";

type BibtexCollection = {
  type: string;
  id: string;
  fields?: Record<string, string>;
};

enum STATES {
  IDLE,
  PARSE_TYPE,
  PARSE_ID,
  PARSE_KEY,
  PARSE_VALUE,
}

const LIMIT = 100000;

function parseBibtex(
  getCharacter: CharacterGenerator,
): BibtexCollection {
  let state = STATES.IDLE;
  let stringBuffer = "";
  let type = "";
  let id = "";
  let key = "";
  let bracesFound = 0;
  const fields: Record<string, string> = {};

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (i === 0 && c !== "@") {
        throw new Error("No matching expression was found");
      }

      state = STATES.PARSE_TYPE;
    }
    if (state === STATES.PARSE_TYPE) {
      if (c === "{") {
        type = stringBuffer.trim();
        stringBuffer = "";

        state = STATES.PARSE_ID;
      } else if (c !== "@") {
        stringBuffer += c;
      }
    }
    if (state === STATES.PARSE_ID) {
      if (c === "," || c === "}") {
        id = stringBuffer.trim();
        stringBuffer = "";

        state = STATES.PARSE_KEY;
      } else if (c !== "{") {
        stringBuffer += c;
      }
    }
    if (state === STATES.PARSE_KEY) {
      if (c === "}") {
        break;
      } else if (c === "=") {
        key = stringBuffer.trim();
        stringBuffer = "";
        bracesFound = 0;

        state = STATES.PARSE_VALUE;
      } else if (c !== ",") {
        stringBuffer += c;
      }
    }
    if (state === STATES.PARSE_VALUE) {
      if (c === "{") {
        if (bracesFound > 0) {
          stringBuffer += c;
        }

        bracesFound++;
      } else if (c === "}") {
        bracesFound--;

        if (bracesFound === 0) {
          fields[key] = stringBuffer.trim();
          stringBuffer = "";

          state = STATES.PARSE_KEY;
        } else {
          stringBuffer += c;
        }
      } else if (c !== "=" && c !== "{") {
        stringBuffer += c;
      }
    }
  }

  if (!type) {
    throw new Error("No matching expression was found");
  }

  return { type, id, fields };
}

export { type BibtexCollection, parseBibtex };
