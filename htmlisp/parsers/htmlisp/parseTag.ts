import { parseAttributes } from "./parseAttributes.ts";
import { getMemo } from "../../../utilities/getMemo.ts";
import { characterGenerator } from "../characterGenerator.ts";
import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

const STATES = {
  IDLE: 0,
  PARSE_END_TAG: 1,
  PARSE_TAG_TYPE: 2,
  PARSE_TAG_ATTRIBUTES: 3,
  PARSE_CHILDREN: 4,
} as const;
type State = typeof STATES[keyof typeof STATES];
type ParseTagState = {
  state: State;
  currentTag: Element | null;
  capturedTags: (string | Element)[];
  content: string;
  depth: number;
};
const LIMIT = 100000;

const memo = getMemo<CharacterGenerator, (Element | string)[]>(new Map());
function cachedParseTag(input: string) {
  return memo(parseTag, characterGenerator(input));
}

function parseTag(
  getCharacter: CharacterGenerator,
  isChild?: boolean,
): (Element | string)[] {
  const parseState: ParseTagState = {
    state: STATES.IDLE,
    currentTag: null,
    capturedTags: [],
    content: "",
    depth: 0,
  };

  for (let i = 0; i < LIMIT; i++) {
    if (parseTagState(parseState, getCharacter, isChild)) {
      break;
    }
  }

  if (parseState.content.trim()) {
    return parseState.capturedTags.concat(parseState.content);
  }

  return parseState.capturedTags.length
    ? parseState.capturedTags
    : [parseState.content];
}

function parseTagState(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
  isChild?: boolean,
) {
  switch (parseState.state) {
    case STATES.IDLE:
      return parseIdle(parseState, getCharacter, isChild);
    case STATES.PARSE_TAG_TYPE:
      return parseTagTypeState(parseState, getCharacter);
    case STATES.PARSE_TAG_ATTRIBUTES:
      parseTagAttributes(parseState, getCharacter);
      break;
    case STATES.PARSE_CHILDREN:
      return parseChildren(parseState, getCharacter);
    case STATES.PARSE_END_TAG:
      return parseEndTag(parseState, getCharacter, isChild);
  }

  return false;
}

function parseIdle(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
  isChild?: boolean,
) {
  const c = getCharacter.next();

  switch (c) {
    case "\n":
      return false;
    case "<":
      parseTagOpening(parseState, getCharacter);
      return false;
    case "/":
      return parseIdleSlash(parseState, getCharacter, isChild);
    case ">":
      parseState.state = isChildlessTag(parseState.currentTag)
        ? STATES.IDLE
        : STATES.PARSE_CHILDREN;
      return false;
    case null:
      return true;
    default:
      return parseIdleContent(parseState, getCharacter, c);
  }
}

function parseIdleSlash(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
  isChild?: boolean,
) {
  parseState.depth--;

  if (parseState.depth === 0 && isChild) {
    return true;
  }

  getCharacter.next();

  return false;
}

function parseIdleContent(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (getCharacter.get() === ">" && parseState.currentTag) {
    parseState.depth--;
    parseState.currentTag.closesWith = c;
    return false;
  }

  getCharacter.previous();
  parseState.state = STATES.PARSE_CHILDREN;

  return false;
}

function parseTagOpening(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  if (getCharacter.get() === "/") {
    parseState.state = STATES.PARSE_END_TAG;

    return;
  }

  if (parseState.depth > 0) {
    getCharacter.previous();
    parseState.state = STATES.PARSE_CHILDREN;

    return;
  }

  parseState.state = STATES.PARSE_TAG_TYPE;
  parseState.depth++;

  if (parseState.content.trim()) {
    parseState.currentTag?.children.push(parseState.content);
  }

  parseState.content = "";
  parseState.currentTag = { type: "", attributes: {}, children: [] };
  parseState.capturedTags.push(parseState.currentTag);
}

function parseTagTypeState(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  if (!parseState.currentTag) {
    throw new Error("No tag to parse for tag type");
  }

  // <!DOCTYPE> case
  if (getCharacter.get() === "!") {
    parseState.depth--;
    parseState.currentTag.closesWith = "";
  }

  parseState.currentTag.type = parseTagType(getCharacter);
  parseState.state = STATES.PARSE_TAG_ATTRIBUTES;

  return getCharacter.get(1) === null;
}

function parseTagAttributes(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  if (!parseState.currentTag) {
    throw new Error("No tag to parse for attributes");
  }

  getCharacter.previous();
  parseState.currentTag.attributes = parseAttributes(getCharacter);
  parseState.state = STATES.IDLE;
}

function parseChildren(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  const c = getCharacter.next();

  if (c === "<") {
    return parseChildOpening(parseState, getCharacter);
  }

  if (c) {
    parseState.content += c;

    return false;
  }

  return true;
}

function parseChildOpening(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  if (getCharacter.get() === "/") {
    parseState.state = STATES.PARSE_END_TAG;

    return false;
  }

  if (parseState.currentTag?.type) {
    parseNestedChild(parseState, getCharacter);
    parseState.state = STATES.IDLE;

    return false;
  }

  if (getCharacter.get(1) === null) {
    return true;
  }

  parseState.capturedTags.push(parseState.content);
  parseState.content = "";
  getCharacter.previous();
  parseState.state = STATES.IDLE;

  return false;
}

function parseNestedChild(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
) {
  if (isChildlessTag(parseState.currentTag)) {
    getCharacter.previous();

    return;
  }

  if (parseState.content.trim()) {
    parseState.currentTag?.children.push(parseState.content);
    parseState.content = "";
  }

  getCharacter.previous();

  if (parseState.currentTag) {
    parseState.currentTag.children = parseState.currentTag.children.concat(
      parseTag(getCharacter, true),
    );
  }
}

function parseEndTag(
  parseState: ParseTagState,
  getCharacter: CharacterGenerator,
  isChild?: boolean,
) {
  const c = getCharacter.next();

  if (c === ">") {
    parseState.depth--;

    if (parseState.content.trim()) {
      parseState.currentTag?.children.push(parseState.content);
    }

    parseState.content = "";
    parseState.currentTag = null;

    // Escape once the current element has been parsed but only if we are not at the root
    if (parseState.depth === 0 && isChild) {
      return true;
    }

    parseState.state = STATES.IDLE;

    return false;
  }

  return c === null;
}

function isChildlessTag(tag: Element | null) {
  return tag?.closesWith === "" || tag?.closesWith === "?";
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

export { cachedParseTag as parseTag };
