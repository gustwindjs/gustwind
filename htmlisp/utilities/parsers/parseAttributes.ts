import { parseAttribute } from "./parseAttribute.ts";
import type { CharacterGenerator } from "./types.ts";
import type { Attributes } from "../../types.ts";

function parseAttributes(getCharacter: CharacterGenerator) {
  const attributes: Attributes = {};

  while (true) {
    const [k, v] = parseAttribute(getCharacter);

    if (k) {
      attributes[k] = v;
    } else {
      break;
    }

    if (getCharacter.get() === null) {
      break;
    }
  }

  return attributes;
}

export { parseAttributes };
