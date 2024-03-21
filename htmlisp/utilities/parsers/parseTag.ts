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
  children: (string | Tag)[];
  closesWith?: string;
};

function parseTag(getCharacter: CharacterGenerator): Tag[] {
  let state = STATES.IDLE;
  // TODO: Maybe this needs to become a Tag directly
  let type = "";
  let content = "";
  const children: (string | Tag)[] = [];
  const attributes: Attributes = {};

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
      const [k, v] = parseAttribute(getCharacter);

      if (k) {
        attributes[k] = v;
      }

      const previous = getCharacter.previous();
      const current = getCharacter.next();

      if (current === ">") {
        const tags = parseTag(getCharacter);

        tags.forEach((t) => {
          children.push(t);
        });

        break;
      } else if (previous === '"' || previous === "'") {
        // Keep on parsing attributes
      } else {
        break;
      }

      /*
      if (c.value === " ") {
        // Keep parsing attributes
      } else if (c.value === ">") {
        // Parse children
      } else {
        // Self-closing case

        tag.closesWith = c;

        return tag;
      }
      */
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
