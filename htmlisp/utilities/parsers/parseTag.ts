import { parseAttributes } from "./parseAttributes.ts";
import type { CharacterGenerator, Tag } from "./types.ts";

const STATES = {
  IDLE: "idle",
  PARSE_END_TAG: "parse end tag",
  PARSE_TAG_TYPE: "parse tag type",
  PARSE_TAG_ATTRIBUTES: "parse tag attributes",
  PARSE_CHILDREN: "parse children",
};

function parseTag(getCharacter: CharacterGenerator): (Tag | string)[] {
  let state = STATES.IDLE;
  let currentTag: Tag = { type: "", attributes: {}, children: [] };
  const capturedTags: (string | Tag)[] = [];
  let content = "";
  let depth = 0;

  while (true) {
    if (state === STATES.IDLE) {
      const c = getCharacter.next();

      if (c === " " || c === "\n") {
        // No-op
      } else if (c === "<") {
        // Closing case - i.e., </
        if (getCharacter.get() === "/") {
          state = STATES.PARSE_END_TAG;
        } else {
          state = STATES.PARSE_TAG_TYPE;

          depth++;
          content.trim() && currentTag.children.push(content);
          content = "";
          currentTag = { type: "", attributes: {}, children: [] };
          capturedTags.push(currentTag);
        }
      } // Self-closing case
      else if (c === "/") {
        depth--;
        getCharacter.next();
      } else if (c === ">") {
        // DOCTYPE cannot have children so keep on parsing. Same for xml
        if (currentTag.closesWith === "" || currentTag.closesWith === "?") {
          state = STATES.IDLE;
        } else {
          state = STATES.PARSE_CHILDREN;
        }
      } // <?xml ... ?>
      else if (getCharacter.get() === ">") {
        currentTag.closesWith = c;
      } // Found content
      else if (c) {
        getCharacter.previous();

        state = STATES.PARSE_CHILDREN;
      }

      if (!c) {
        break;
      }
    } else if (state === STATES.PARSE_TAG_TYPE) {
      // <!DOCTYPE> case
      if (getCharacter.get() === "!") {
        currentTag.closesWith = "";
      }

      currentTag.type = parseTagType(getCharacter);
      state = STATES.PARSE_TAG_ATTRIBUTES;
    } else if (state === STATES.PARSE_TAG_ATTRIBUTES) {
      getCharacter.previous();
      currentTag.attributes = parseAttributes(getCharacter);
      state = STATES.IDLE;
    } else if (state === STATES.PARSE_CHILDREN) {
      const c = getCharacter.next();

      if (c === "<") {
        if (getCharacter.get() === "/") {
          state = STATES.PARSE_END_TAG;
        } else if (currentTag.type) {
          if (content) {
            currentTag.children.push(content);
            content = "";
          }

          getCharacter.previous();

          currentTag.children = currentTag.children.concat(
            parseTag(getCharacter),
          );

          state = STATES.IDLE;
        }
      } else if (c) {
        content += c;
      } else {
        break;
      }
    } else if (state === STATES.PARSE_END_TAG) {
      const c = getCharacter.next();

      if (c === ">") {
        depth--;

        // Escape once the current tree has been parsed
        if (depth === -1) {
          break;
        }

        state = STATES.IDLE;
      }
    }
  }

  if (content.trim()) {
    currentTag.children.push(content);
  }

  return currentTag.type ? capturedTags : [content];
}

function parseTagType(getCharacter: CharacterGenerator) {
  let tagType = "";

  let c = getCharacter.next();
  while (c) {
    if (c === " " || c === "/" || c === ">") {
      return tagType;
    } else if (c !== "\n") {
      tagType += c;
    }

    c = getCharacter.next();
  }

  return tagType;
}

export { parseTag };
