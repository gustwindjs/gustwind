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
  // TODO: Parse name until terminating
  return "href";

  /*
  if (c === "=") {
    yield { value, mode: STATES.PARSE_ATTRIBUTE_VALUE };
  } // Attribute name was not found after all
  else if (c === ">") {
    // Note that self-closing attributes can be found at the end of a tag
    if (capturedAttribute.name) {
      currentTag.attributes.push({
        name: capturedAttribute.name,
        value: null,
      });
      capturedAttribute = { name: "", value: "" };
    }

    parsingState = PARSE_CHILDREN_START;
    yield { value, state: STATES.CAPTURE_ATTRIBUTE };
  } else if (c === "?" || c === "/") {
    // TODO: Figure out how to model this case -> push to another parser?
    // currentTag.closesWith = c;
  } // Self-closing attribute
  else if (c === " ") {
    if (capturedAttribute.name) {
      currentTag.attributes.push({
        name: capturedAttribute.name,
        value: null,
      });
      parsingState = PARSE_ATTRIBUTE_NAME;
      capturedAttribute = { name: "", value: "" };
    }

    // TODO: Capture attribute name now, no value in this case
    // yield { value, mode: PARSE_ATTRIBUTE_NAME };
    yield { value, state: STATES.CAPTURE_ATTRIBUTE };
  } else {
    yield { value: value + c, state: STATES.PARSE_ATTRIBUTE_NAME };
  }
  */
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
