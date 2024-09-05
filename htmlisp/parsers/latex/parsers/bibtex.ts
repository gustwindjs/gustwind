import { characterGenerator } from "../../characterGenerator.ts";

enum STATES {
  IDLE,
  PARSE_TYPE,
}

const LIMIT = 100000;

function parseBibtex(
  input: string,
): { type: string; id?: string; fields?: Record<string, string> } {
  let state = STATES.IDLE;
  const getCharacter = characterGenerator(input);

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (i === 0 && c !== "@") {
        throw new Error("No matching expression was found");
      }
    }
  }

  return { type: "BOOK" };
}

export { parseBibtex };
