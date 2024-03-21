import { parseAttribute } from "./parseAttribute.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

function parseAttributes(getCharacter: CharacterGenerator) {
  const attributes: Attributes = {};

  while (true) {
    const [k, v] = parseAttribute(getCharacter);

    if (k) {
      attributes[k] = v;
    }

    const current = getCharacter.next();

    if (!current) {
      getCharacter.previous();

      break;
    }
  }

  return attributes;
}

export { parseAttributes };
