import type { CharacterGenerator } from "./types.ts";

const STATES = {
  PARSE_ATTRIBUTE_NAME: "parse attribute name",
  PARSE_ATTRIBUTE_VALUE: "parse attribute value",
  CAPTURE_ATTRIBUTE: "capture attribute",
};

function parseAttribute(
  getCharacter: CharacterGenerator,
): [string, string | null] {
  let state = STATES.PARSE_ATTRIBUTE_NAME;
  let attributeName = "";
  let attributeValue = null;

  while (true) {
    if (state === STATES.PARSE_ATTRIBUTE_NAME) {
      attributeName = parseAttributeName(getCharacter);

      if (attributeName) {
        const c = getCharacter.current();

        if (c === " ") {
          break;
        } else {
          getCharacter.next();

          state = STATES.PARSE_ATTRIBUTE_VALUE;
        }
      } else {
        break;
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

  let c = getCharacter.next();

  if (c === "/") {
    return attributeName;
  }

  while (c) {
    if (c === "=" || c === "/" || c === "?" || c === " ") {
      getCharacter.previous();

      return attributeName;
    }

    attributeName += c;

    c = getCharacter.next();
  }

  return attributeName;
}

function parseAttributeValue(getCharacter: CharacterGenerator) {
  let singleQuotesFound = 0;
  let doubleQuotesFound = 0;
  let attributeValue = "";

  let c = getCharacter.next();
  while (c) {
    if (c === '"') {
      if (singleQuotesFound > 0) {
        // Escape "'s in single quote mode
        attributeValue += `\"`;
      } else {
        doubleQuotesFound++;

        if (doubleQuotesFound === 2) {
          return attributeValue;
        }
      }
    } else if (c === "'") {
      if (doubleQuotesFound === 0) {
        singleQuotesFound++;

        if (singleQuotesFound === 2) {
          return attributeValue;
        }
      } else {
        attributeValue += c;
      }
    } else {
      attributeValue += c;
    }

    c = getCharacter.next();
  }

  return attributeValue;
}

export { parseAttribute };
