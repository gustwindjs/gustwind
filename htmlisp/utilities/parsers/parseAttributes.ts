import { parseAttribute } from "./parseAttribute.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

function parseAttributes(getCharacter: CharacterGenerator) {
  const attributes: Attributes = {};

  while (true) {
    const [k, v] = parseAttribute(getCharacter);

    if (k) {
      attributes[k] = v;
    } else {
      break;
    }

    if (getCharacter.current() === null) {
      break;
    }
  }

  return attributes;
}

export { parseAttributes };
