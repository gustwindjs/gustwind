import type { Attributes, CharacterGenerator } from "./types.ts";

const STATES = {
  PARSE_ATTRIBUTE_NAME: "parse attribute name",
  PARSE_ATTRIBUTE_VALUE: "parse attribute value",
  CAPTURE_ATTRIBUTE: "capture attribute",
};

function parseAttribute(
  getCharacter: CharacterGenerator,
): Attributes {
  // const { value, done } = getCharacter.next();
  let state = STATES.PARSE_ATTRIBUTE_NAME;
  let attributeName = "";
  let attributeValue = null;

  // TODO: Maybe this needs to be captured into a helper function
  //let result = getCharacter.next();
  while (true /*!result.done*/) {
    if (state === STATES.PARSE_ATTRIBUTE_NAME) {
      // TODO: Run parseAttributeName now and capture return value + state
      // Most likely it should receive the generator and use it to figure out
      // the name
      attributeName = parseAttributeName(getCharacter);
      state = STATES.PARSE_ATTRIBUTE_VALUE;
    } else if (state === STATES.PARSE_ATTRIBUTE_VALUE) {
      // TODO
      attributeValue = parseAttributeValue(getCharacter);
    }

    // result = getCharacter.next();

    // TODO: Termination state
    break;
  }

  // TODO: To rewind, pass { rewind: true } to next() as a parameter

  // 1. Parse attribute name
  /*
  if (value === "=") {
    // TODO
  } // Self-closing case
  else if (value === "/") {
    // TODO: Rewind and return
  } else if (value === " ") {
    // Ok,done
  }
  */

  // If parsing name ended with =, parse value as well
  // 2. Parse attribute value
  // 3. Repeat the process until all attributes are clear

  // TODO: This should return once end state has been reached
  // TODO: This should also be able to rewind getCharacter for special cases (non-whitespace as a terminator)
  return { [attributeName]: attributeValue };
}

function parseAttributeName(getCharacter: CharacterGenerator) {
  let attributeName = "";

  let result = getCharacter.next();
  while (!result.done) {
    const c = result.value;

    if (c === "=" || c === "/" || c === "?") {
      return attributeName;
    } else {
      attributeName += c;
    }

    result = getCharacter.next();
  }

  return attributeName;
}

function parseAttributeValue(getCharacter: CharacterGenerator) {
  return "test";
  /*
  let singleQuotesFound = 0;
  let doubleQuotesFound = 0;

  if (c === '"') {
    if (singleQuotesFound > 0) {
      // Escape "'s in single quote mode
      yield { value: value + `\"`, state: STATES.PARSE_ATTRIBUTE_VALUE };
    } else {
      doubleQuotesFound++;

      if (doubleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, state: STATES.PARSE_ATTRIBUTE_NAME };
      }
    }
  } else if (c === "'") {
    if (doubleQuotesFound === 0) {
      singleQuotesFound++;

      if (singleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, state: STATES.PARSE_ATTRIBUTE_VALUE };
      }
    } else {
      yield { value: value + c, state: STATES.PARSE_ATTRIBUTE_VALUE };
    }
  } else {
    yield { value: value + c, state: STATES.PARSE_ATTRIBUTE_VALUE };
  }
  */
}

export { parseAttribute, parseAttributeName, parseAttributeValue };
