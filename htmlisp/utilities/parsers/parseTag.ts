import { parseAttribute } from "./parseAttribute.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

const STATES = {
  IDLE: "idle",
  PARSE_TAG_END: "parse tag end",
  PARSE_TAG_NAME: "parse tag name",
  PARSE_TAG_ATTRIBUTES: "parse tag attributes",
  PARSE_CHILDREN: "parse children",
};

// TODO: Use the same type here as for the earlier parser
type Tag = {
  type: string;
  attributes?: Attributes;
  children: (string | Tag)[] | null;
  closesWith?: string;
};

// TODO: After parsing an attribute, rollback and check the character here
// TODO: To rewind, pass { rewind: true } to next() as a parameter
function parseTag(getCharacter: CharacterGenerator): Tag[] {
  let state = STATES.IDLE;
  let type = "";
  let content = "";
  const attributes: Attributes = {};

  while (true) {
    if (state === STATES.IDLE) {
      const c = getCharacter.next();

      if (c.value === " ") {
        // No-op
      } else if (c.value === "<") {
        state = STATES.PARSE_TAG_NAME;
      } else if (c.value) {
        content += c.value;
      }

      if (c.done) {
        break;
      }
    } else if (state === STATES.PARSE_TAG_NAME) {
      type = parseTagName(getCharacter);
      state = STATES.PARSE_TAG_ATTRIBUTES;
    } else if (state === STATES.PARSE_TAG_ATTRIBUTES) {
      const [k, v] = parseAttribute(getCharacter);

      attributes[k] = v;

      break;

      // TODO: Take a peek at the last character and figure out what to do next
      const c = getCharacter.next({ previous: true });

      if (c === " ") {
        // Keep parsing attributes
      } else if (c === ">") {
        // Parse children
      } else {
        // Self-closing caes

        tag.closesWith = c;

        return tag;
      }
    } else if (state === STATES.PARSE_CHILDREN) {
      // TODO
      break;

      // state = STATES.PARSE_TAG_END;
    }
  }

  return [{ type, attributes, children: content ? [content] : null }];
}

// TODO
function parseTagName(getCharacter: CharacterGenerator) {
  let tagName = "";

  let result = getCharacter.next();
  while (!result.done) {
    const c = result.value;

    if (c === " ") {
      return tagName;
    }

    tagName += c;

    result = getCharacter.next();
  }

  return tagName;

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

  // yield { value, state: states.IDLE };
}

// TODO
function parseTagEnd(getCharacter: CharacterGenerator) {
  return "foobar";

  /*
  if (c === ">") {
    if (input[i - 1] !== "?") {
      parsingState = PARSE_CHILDREN_START;
    } else {
      parsingState = NOT_PARSING;
    }
  }
  */

  // yield { value, state: states.IDLE };
}

export { parseTag };
