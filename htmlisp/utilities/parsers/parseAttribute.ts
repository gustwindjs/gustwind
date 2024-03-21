import * as states from "./states.ts";

type CharacterGenerator = Generator<string, void, unknown>;

// TODO: Add parseAttributes (a generalization of parseAttribute that can handle many)
function parseAttributes(getCharacter: CharacterGenerator) {
  // TODO: The logic here should be able to parse multiple attributes

  return { href: "test", title: "foobar" };
}

function parseAttribute(getCharacter: CharacterGenerator) {
  const c = getCharacter.next();

  // TODO: The logic here should be able to parse a single attribute and
  // return it as an object
  console.log(c);

  return { href: "test" };
}

function* parseAttributeName(value: string, c: string) {
  if (c === "=") {
    yield { value, mode: states.PARSE_ATTRIBUTE_VALUE };
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
    yield { value, state: states.CAPTURE_ATTRIBUTE };
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
    yield { value, state: states.CAPTURE_ATTRIBUTE };
  } else {
    yield { value: value + c, state: states.PARSE_ATTRIBUTE_NAME };
  }
}

function* parseAttributeValue(value: string, c: string) {
  let singleQuotesFound = 0;
  let doubleQuotesFound = 0;

  if (c === '"') {
    if (singleQuotesFound > 0) {
      // Escape "'s in single quote mode
      yield { value: value + `\"`, state: states.PARSE_ATTRIBUTE_VALUE };
    } else {
      doubleQuotesFound++;

      if (doubleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, state: states.PARSE_ATTRIBUTE_NAME };
      }
    }
  } else if (c === "'") {
    if (doubleQuotesFound === 0) {
      singleQuotesFound++;

      if (singleQuotesFound === 2) {
        doubleQuotesFound = 0;
        singleQuotesFound = 0;

        yield { value, state: states.PARSE_ATTRIBUTE_VALUE };
      }
    } else {
      yield { value: value + c, state: states.PARSE_ATTRIBUTE_VALUE };
    }
  } else {
    yield { value: value + c, state: states.PARSE_ATTRIBUTE_VALUE };
  }
}

export {
  parseAttribute,
  parseAttributeName,
  parseAttributes,
  parseAttributeValue,
};
