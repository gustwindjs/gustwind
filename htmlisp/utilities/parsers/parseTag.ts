import { parseAttributes } from "./parseAttributes.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

const STATES = {
  IDLE: "idle",
  PARSE_TAG_END: "parse tag end",
  PARSE_TAG_NAME: "parse tag name",
  PARSE_TAG_ATTRIBUTES: "parse tag attributes",
  PARSE_END_TAG: "parse end tag",
  PARSE_CHILDREN: "parse children",
};

// TODO: Use the same type here as for the earlier parser
type Tag = {
  type: string;
  attributes?: Attributes;
  children: (string | Tag)[];
  closesWith?: string;
};

function parseTag(getCharacter: CharacterGenerator): (Tag | string)[] {
  let state = STATES.IDLE;
  // TODO: Maybe this needs to become a Tag directly
  let type = "";
  let content = "";
  const children: (string | Tag)[] = [];
  let attributes: Attributes = {};

  while (true) {
    if (state === STATES.IDLE) {
      const c = getCharacter.next();

      if (c === " ") {
        // No-op
      } else if (c === "<") {
        state = STATES.PARSE_TAG_NAME;
      } // Found content
      else if (c) {
        getCharacter.previous();

        state = STATES.PARSE_CHILDREN;
      }

      if (!c) {
        break;
      }
    } else if (state === STATES.PARSE_TAG_NAME) {
      type = parseTagName(getCharacter);
      state = STATES.PARSE_TAG_ATTRIBUTES;
    } else if (state === STATES.PARSE_TAG_ATTRIBUTES) {
      attributes = parseAttributes(getCharacter);
      state = STATES.PARSE_END_TAG;
    } else if (state === STATES.PARSE_CHILDREN) {
      const c = getCharacter.next();

      if (c === "<") {
        state = STATES.PARSE_TAG_END;
      } else if (c) {
        content += c;
      } else {
        break;
      }
    } else if (state === STATES.PARSE_TAG_END) {
      const c = getCharacter.next();

      if (c === ">") {
        break;
      }
    } else if (state === STATES.PARSE_END_TAG) {
      // TODO: Figure out what to do in this case
      break;
      /*
      const c = getCharacter.next();

      if (c === ">") {
        break;
      }
      */
    }
  }

  if (content) {
    children.push(content);
  }

  return [{ type, attributes, children }];
}

// TODO
function parseTagName(getCharacter: CharacterGenerator) {
  let tagName = "";

  let c = getCharacter.next();
  while (c) {
    if (c === " ") {
      return tagName;
    }

    tagName += c;

    c = getCharacter.next();
  }

  return tagName;
}

export { parseTag };
