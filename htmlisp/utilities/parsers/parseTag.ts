import { parseAttributes } from "./parseAttributes.ts";
import type { Attributes, CharacterGenerator } from "./types.ts";

const STATES = {
  IDLE: "idle",
  PARSE_END_TAG: "parse end tag",
  PARSE_TAG_NAME: "parse tag name",
  PARSE_TAG_ATTRIBUTES: "parse tag attributes",
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
  // TODO: Refactor this as capturedTags to allow supporting siblings
  let type = "";
  let content = "";
  let children: (string | Tag)[] = [];
  let attributes: Attributes = {};

  while (true) {
    if (state === STATES.IDLE) {
      const c = getCharacter.next();

      if (c === " ") {
        // No-op
      } else if (c === "<") {
        state = STATES.PARSE_TAG_NAME;
      } // Self-closing case
      else if (c === ">") {
        // No-op
      } // Found content
      else if (c) {
        getCharacter.previous();

        state = STATES.PARSE_CHILDREN;
      }

      if (!c) {
        break;
      }
    } else if (state === STATES.PARSE_TAG_NAME) {
      if (type) {
        getCharacter.previous();
        children = children.concat(parseTag(getCharacter));
        // TODO: This should be used instead
        // state = STATES.PARSE_END_TAG;
        state = STATES.IDLE;
      } else {
        type = parseTagName(getCharacter);
        state = STATES.PARSE_TAG_ATTRIBUTES;
      }
    } else if (state === STATES.PARSE_TAG_ATTRIBUTES) {
      getCharacter.previous();
      attributes = parseAttributes(getCharacter);
      getCharacter.next();
      state = STATES.IDLE;
    } else if (state === STATES.PARSE_CHILDREN) {
      const c = getCharacter.next();

      if (c === "<") {
        state = STATES.PARSE_END_TAG;
      } else if (c) {
        content += c;
      } else {
        break;
      }
    } else if (state === STATES.PARSE_END_TAG) {
      const c = getCharacter.next();

      if (c === ">") {
        break;
      }
    }
  }

  if (content) {
    children.push(content);
  }

  return [type ? { type, attributes, children } : content];
}

function parseTagName(getCharacter: CharacterGenerator) {
  let tagName = "";

  let c = getCharacter.next();
  while (c) {
    if (c === " " || c === ">") {
      return tagName;
    }

    tagName += c;

    c = getCharacter.next();
  }

  return tagName;
}

export { parseTag };
