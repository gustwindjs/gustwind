import type { CharacterGenerator } from "../types.ts";

const STATES = {
  FIND_ATTRIBUTE_NAME: 0,
  FIND_EQUALS: 1,
  PARSE_ATTRIBUTE_NAME: 2,
  PARSE_ATTRIBUTE_VALUE: 3,
} as const;
type State = (typeof STATES)[keyof typeof STATES];
type ParseAttributeState = {
  state: State;
  attributeName: string;
  attributeValue: string | boolean | null;
};
type AttributeValueState = {
  singleQuotesFound: number;
  doubleQuotesFound: number;
  backtickQuotesFound: number;
  attributeValue: string;
};
const LIMIT = 100000;
const ATTRIBUTE_NAME_END_CHARACTERS = new Set(["/", "<", ">", "=", "?", " "]);

function parseAttribute(
  getCharacter: CharacterGenerator,
): [string, string | boolean | null] {
  const parseState: ParseAttributeState = {
    state: STATES.FIND_ATTRIBUTE_NAME,
    attributeName: "",
    attributeValue: true,
  };

  for (let i = 0; i < LIMIT; i++) {
    if (parseAttributeState(parseState, getCharacter)) {
      break;
    }
  }

  return [parseState.attributeName, parseState.attributeValue];
}

function parseAttributeState(
  parseState: ParseAttributeState,
  getCharacter: CharacterGenerator,
) {
  switch (parseState.state) {
    case STATES.FIND_ATTRIBUTE_NAME:
      findAttributeName(parseState, getCharacter);
      break;
    case STATES.PARSE_ATTRIBUTE_NAME:
      return parseAttributeNameState(parseState, getCharacter);
    case STATES.FIND_EQUALS:
      return findEquals(parseState, getCharacter);
    case STATES.PARSE_ATTRIBUTE_VALUE:
      parseState.attributeValue = parseAttributeValue(getCharacter) || null;
      return true;
  }

  return false;
}

function findAttributeName(
  parseState: ParseAttributeState,
  getCharacter: CharacterGenerator,
) {
  const c = getCharacter.next();

  if (c !== " " && c !== "\n") {
    getCharacter.previous();
    parseState.state = STATES.PARSE_ATTRIBUTE_NAME;
  }
}

function parseAttributeNameState(
  parseState: ParseAttributeState,
  getCharacter: CharacterGenerator,
) {
  parseState.attributeName = parseAttributeName(getCharacter);

  if (!parseState.attributeName) {
    return true;
  }

  parseState.state = STATES.FIND_EQUALS;

  return false;
}

function findEquals(
  parseState: ParseAttributeState,
  getCharacter: CharacterGenerator,
) {
  const c = getCharacter.get();

  if (c === " ") {
    getCharacter.next();

    return false;
  }

  if (c === "=") {
    getCharacter.next();
    parseState.state = STATES.PARSE_ATTRIBUTE_VALUE;

    return false;
  }

  return true;
}

function parseAttributeName(getCharacter: CharacterGenerator) {
  let attributeName = "";
  let c = getCharacter.get();

  if (isAttributeNameEnd(c)) {
    return attributeName;
  }

  while (c) {
    c = getCharacter.next();

    if (isAttributeNameEnd(c)) {
      getCharacter.previous();

      return attributeName;
    }

    attributeName += getAttributeNameCharacter(c);
  }

  return attributeName;
}

function isAttributeNameEnd(c: string | null) {
  return c === null || ATTRIBUTE_NAME_END_CHARACTERS.has(c);
}

function getAttributeNameCharacter(c: string | null) {
  return c === "\n" || c === null ? "" : c;
}

function parseAttributeValue(getCharacter: CharacterGenerator) {
  const parseState: AttributeValueState = {
    singleQuotesFound: 0,
    doubleQuotesFound: 0,
    backtickQuotesFound: 0,
    attributeValue: "",
  };
  let c = getCharacter.next();

  while (c) {
    if (parseAttributeValueCharacter(parseState, c)) {
      return parseState.attributeValue;
    }

    c = getCharacter.next();
  }

  return parseState.attributeValue;
}

function parseAttributeValueCharacter(
  parseState: AttributeValueState,
  c: string,
) {
  if (c === '"') {
    return parseDoubleQuote(parseState);
  }

  if (isSingleQuoteDelimiter(parseState, c)) {
    return parseQuote(parseState, "singleQuotesFound");
  }

  if (isBacktickQuoteDelimiter(parseState, c)) {
    return parseQuote(parseState, "backtickQuotesFound");
  }

  parseState.attributeValue += c;

  return false;
}

function isSingleQuoteDelimiter(parseState: AttributeValueState, c: string) {
  return (
    c === "'" &&
    !parseState.doubleQuotesFound &&
    !parseState.backtickQuotesFound
  );
}

function isBacktickQuoteDelimiter(parseState: AttributeValueState, c: string) {
  return c === "`" && !parseState.doubleQuotesFound;
}

function parseQuote(
  parseState: AttributeValueState,
  quoteField: "singleQuotesFound" | "backtickQuotesFound",
) {
  parseState[quoteField]++;

  return parseState[quoteField] === 2;
}

function parseDoubleQuote(parseState: AttributeValueState) {
  // Escape "'s in single and backtick quote modes
  if (parseState.singleQuotesFound > 0 || parseState.backtickQuotesFound > 0) {
    parseState.attributeValue += `\"`;

    return false;
  }

  parseState.doubleQuotesFound++;

  return parseState.doubleQuotesFound === 2;
}

export { parseAttribute };
