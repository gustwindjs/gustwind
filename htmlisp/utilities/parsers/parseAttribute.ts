import {
  CAPTURE_ATTRIBUTE,
  PARSE_ATTRIBUTE_NAME,
  PARSE_ATTRIBUTE_VALUE,
} from "./states.ts";

function* parseAttributeName(c: string, value: string) {
  if (c === "=") {
    yield { value, mode: PARSE_ATTRIBUTE_VALUE };
  } // Attribute name was not found after all
  else if (c === ">") {
    // Note that self-closing attributes can be found at the end of a tag
    /*if (capturedAttribute.name) {
      currentTag.attributes.push({
        name: capturedAttribute.name,
        value: null,
      });
      capturedAttribute = { name: "", value: "" };
    }

    parsingState = PARSE_CHILDREN_START;
    */
    yield { value, mode: CAPTURE_ATTRIBUTE };
  } else if (c === "?" || c === "/") {
    // TODO: Figure out how to model this case -> push to another parser?
    // currentTag.closesWith = c;
  } // Self-closing attribute
  else if (c === " ") {
    /*
    if (capturedAttribute.name) {
      currentTag.attributes.push({
        name: capturedAttribute.name,
        value: null,
      });
      parsingState = PARSE_ATTRIBUTE_NAME;
      capturedAttribute = { name: "", value: "" };
    }*/

    // TODO: Capture attribute name now, no value in this case
    // yield { value, mode: PARSE_ATTRIBUTE_NAME };
    yield { value, mode: CAPTURE_ATTRIBUTE };
  } else {
    yield { value, mode: PARSE_ATTRIBUTE_NAME };
  }
}

function* parseAttributeValue(c: string, value: string) {
  let singleQuotesFound = 0;
  let doubleQuotesFound = 0;

  if (c === '"') {
    if (singleQuotesFound > 0) {
      // Escape "'s in single quote mode
      yield { value: value + `\"`, mode: PARSE_ATTRIBUTE_VALUE };
    } else {
      doubleQuotesFound++;

      if (doubleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, mode: PARSE_ATTRIBUTE_NAME };
      }
    }
  } else if (c === "'") {
    if (doubleQuotesFound === 0) {
      singleQuotesFound++;

      if (singleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, mode: PARSE_ATTRIBUTE_VALUE };
      }
    } else {
      yield { value: value + c, mode: PARSE_ATTRIBUTE_VALUE };
    }
  } else {
    yield { value: value + c, mode: PARSE_ATTRIBUTE_VALUE };
  }
}

export { parseAttributeName, parseAttributeValue };
