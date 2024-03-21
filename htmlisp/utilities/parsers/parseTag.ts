import * as states from "./states.ts";
import { parseAttribute } from "./parseAttribute.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

// TODO: Use the same type here as for the earlier parser
type Tag = {
  type: string;
  attributes?: Attributes;
  children?: (string | Tag)[];
};

// TODO: After parsing an attribute, rollback and check the character here
// TODO: To rewind, pass { rewind: true } to next() as a parameter
function parseTag(
  getCharacter: CharacterGenerator,
): Tag {
  const c = getCharacter.next();

  // TODO: The logic here should be able to parse a tag and use
  // parseAttribute as a helper
  console.log(c);

  return { type: "a", attributes: { href: "test", title: "foobar" } };
}

// TODO
function* parseTagStart(value: string, c: string) {
  /*
  if (c === ">") {
    parsingState = PARSE_CHILDREN_START;
  } else if (c === " ") {
    parsingState = PARSE_ATTRIBUTE_NAME;
  } else if (c === "/") {
    currentTag.closesWith = "/";
  } else if (c === "!") {
    // DOCTYPE case
    currentTag.closesWith = "";
    currentTag.type += c;
  } else if (c === "?") {
    currentTag.closesWith = "?";
    currentTag.type += c;
  } else if (c !== "<") {
    currentTag.type += c;
  }
  */

  yield { value, state: states.IDLE };
}

// TODO
function* parseTagEnd(value: string, c: string) {
  /*
  if (c === ">") {
    if (input[i - 1] !== "?") {
      parsingState = PARSE_CHILDREN_START;
    } else {
      parsingState = NOT_PARSING;
    }
  }
  */

  yield { value, state: states.IDLE };
}

export { parseTag, parseTagEnd, parseTagStart };
