import { parseAttribute } from "./parseAttribute.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

// TODO: Set up a parsing loop here
function parseAttributes(getCharacter: CharacterGenerator) {
  const attributes: Attributes = {};
  const [k, v] = parseAttribute(getCharacter);

  if (k) {
    attributes[k] = v;
  }

  // Step back to catch the terminating character
  getCharacter.previous();
  const current = getCharacter.next();

  /*
  if (current === " " || current === '"' || current === "'") {
    // Keep on parsing attributes
  } else {
    // TODO
  }
  */

  return attributes;
}

export { parseAttributes };
