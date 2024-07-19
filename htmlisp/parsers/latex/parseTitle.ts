import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

const LIMIT = 100000;

function parseTitle(
  getCharacter: CharacterGenerator,
): Element[] {
  let ret = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    ret += c;
  }

  return [{
    type: "p",
    attributes: {},
    children: [ret],
  }];
}

export { parseTitle };
