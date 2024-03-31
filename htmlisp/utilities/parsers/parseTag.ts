import { parseAttributes } from "./parseAttributes.ts";
import type { CharacterGenerator } from "./types.ts";
import type { Element } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_END_TAG,
  PARSE_TAG_TYPE,
  PARSE_TAG_ATTRIBUTES,
  PARSE_CHILDREN,
}

function parseTag(
  getCharacter: CharacterGenerator,
  isChild?: boolean,
): (Element | string)[] {
  let state = STATES.IDLE;
  let currentTag: Element | null = null;
  const capturedTags: (string | Element)[] = [];
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
          // Keep on parsing siblings if we are within a node already
          if (depth > 0) {
            getCharacter.previous();

            state = STATES.PARSE_CHILDREN;
          } // Otherwise construct a root node
          else {
            state = STATES.PARSE_TAG_TYPE;

            depth++;
            content.trim() && currentTag?.children.push(content);
            content = "";
            currentTag = { type: "", attributes: {}, children: [] };
            capturedTags.push(currentTag);
          }
        }
      } // Self-closing case
      else if (c === "/") {
        depth--;

        if (depth === 0 && isChild) {
          break;
        }

        getCharacter.next();
      } else if (c === ">") {
        // DOCTYPE cannot have children so keep on parsing. Same for xml
        if (currentTag?.closesWith === "" || currentTag?.closesWith === "?") {
          state = STATES.IDLE;
        } else {
          state = STATES.PARSE_CHILDREN;
        }
      } // <?xml ... ?>
      else if (getCharacter.get() === ">") {
        if (currentTag) {
          depth--;
          currentTag.closesWith = c;
        }
      } // Found content
      else if (c) {
        getCharacter.previous();

        state = STATES.PARSE_CHILDREN;
      }

      if (!c) {
        break;
      }
    } else if (state === STATES.PARSE_TAG_TYPE) {
      if (currentTag) {
        // <!DOCTYPE> case
        if (getCharacter.get() === "!") {
          depth--;
          currentTag.closesWith = "";
        }

        currentTag.type = parseTagType(getCharacter);
        state = STATES.PARSE_TAG_ATTRIBUTES;
      } else {
        throw new Error("No tag to parse for tag type");
      }
    } else if (state === STATES.PARSE_TAG_ATTRIBUTES) {
      if (currentTag) {
        getCharacter.previous();
        currentTag.attributes = parseAttributes(getCharacter);
        state = STATES.IDLE;
      } else {
        throw new Error("No tag to parse for attributes");
      }
    } else if (state === STATES.PARSE_CHILDREN) {
      const c = getCharacter.next();

      if (c === "<") {
        if (getCharacter.get() === "/") {
          state = STATES.PARSE_END_TAG;
        } else if (currentTag?.type) {
          if (content.trim()) {
            currentTag.children.push(content);
            content = "";
          }

          getCharacter.previous();

          currentTag.children = currentTag.children.concat(
            parseTag(getCharacter, true),
          );

          state = STATES.IDLE;
        } // No tag was found yet so we have only pure content
        else {
          capturedTags.push(content);
          content = "";

          getCharacter.previous();

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

        content.trim() && currentTag?.children.push(content);
        content = "";

        currentTag = null;

        // Escape once the current element has been parsed but only if we are not at the root
        if (depth === 0 && isChild) {
          break;
        }

        state = STATES.IDLE;
      }
    }
  }

  if (content.trim()) {
    return capturedTags.concat(content);
  }

  return capturedTags.length ? capturedTags : [content];
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
