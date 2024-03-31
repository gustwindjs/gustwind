import type { CharacterGenerator } from "./types.ts";

enum STATES {
  FIND_ATTRIBUTE_NAME,
  FIND_EQUALS,
  PARSE_ATTRIBUTE_NAME,
  PARSE_ATTRIBUTE_VALUE,
  CAPTURE_ATTRIBUTE,
}

function parseAttribute(
  getCharacter: CharacterGenerator,
): [string, string | null] {
  let state = STATES.FIND_ATTRIBUTE_NAME;
  let attributeName = "";
  let attributeValue = null;

  while (true) {
    if (state === STATES.FIND_ATTRIBUTE_NAME) {
      const c = getCharacter.next();

      if (c !== " " && c !== "\n") {
        getCharacter.previous();

        state = STATES.PARSE_ATTRIBUTE_NAME;
      }
    } else if (state === STATES.PARSE_ATTRIBUTE_NAME) {
      attributeName = parseAttributeName(getCharacter);

      if (attributeName) {
        state = STATES.FIND_EQUALS;
      } else {
        break;
      }
    } else if (state === STATES.FIND_EQUALS) {
      const c = getCharacter.get();

      if (c === " ") {
        // Keep searching
        getCharacter.next();
      } else if (c === "=") {
        getCharacter.next();

        state = STATES.PARSE_ATTRIBUTE_VALUE;
      } else {
        // Only name, no value
        return [attributeName, attributeValue];
      }
    } else if (state === STATES.PARSE_ATTRIBUTE_VALUE) {
      attributeValue = parseAttributeValue(getCharacter) || null;

      break;
    }
  }

  return [attributeName, attributeValue];
}

function parseAttributeName(getCharacter: CharacterGenerator) {
  let attributeName = "";
  let c = getCharacter.get();

  if (c === "/" || c === "<" || c === ">") {
    return attributeName;
  }

  while (c) {
    c = getCharacter.next();

    if (c === "=" || c === "/" || c === "?" || c === " " || c === ">") {
      getCharacter.previous();

      return attributeName;
    } else if (c !== "\n") {
      attributeName += c;
    }
  }

  return attributeName;
}

function parseAttributeValue(getCharacter: CharacterGenerator) {
  let singleQuotesFound = 0;
  let doubleQuotesFound = 0;
  let backtickQuotesFound = 0;
  let attributeValue = "";
  let c = getCharacter.next();

  while (c) {
    if (c === '"') {
      // Escape "'s in single and backtick quote modes
      if (singleQuotesFound > 0 || backtickQuotesFound > 0) {
        attributeValue += `\"`;
      } else {
        doubleQuotesFound++;

        if (doubleQuotesFound === 2) {
          return attributeValue;
        }
      }
    } else if (c === "'" && !doubleQuotesFound && !backtickQuotesFound) {
      singleQuotesFound++;

      if (singleQuotesFound === 2) {
        return attributeValue;
      }
    } else if (c === "`" && !doubleQuotesFound) {
      backtickQuotesFound++;

      if (backtickQuotesFound === 2) {
        return attributeValue;
      }
    } else {
      attributeValue += c;
    }

    c = getCharacter.next();
  }

  return attributeValue;
}

export { parseAttribute };
