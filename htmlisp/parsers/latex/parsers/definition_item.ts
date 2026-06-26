import type { CharacterGenerator } from "../../types.ts";

const STATES = {
  IDLE: "IDLE",
  PARSE_ITEM: "PARSE_ITEM",
  PARSE_TITLE: "PARSE_TITLE",
  PARSE_DESCRIPTION_WHITESPACE: "PARSE_DESCRIPTION_WHITESPACE",
  PARSE_DESCRIPTION: "PARSE_DESCRIPTION",
} as const;
type State = (typeof STATES)[keyof typeof STATES];
type ParserState = {
  state: State;
  title: string;
  description: string;
  itemIndex: number;
};
type DefinitionCharacterParser = (
  parserState: ParserState,
  getCharacter: CharacterGenerator,
  c: string,
) => boolean;

const LIMIT = 100000;
const ITEM_SYNTAX = "item";
const definitionCharacterParsers: Record<State, DefinitionCharacterParser> = {
  [STATES.IDLE]: parseIdle,
  [STATES.PARSE_DESCRIPTION]: parseDescriptionCharacter,
  [STATES.PARSE_DESCRIPTION_WHITESPACE]: parseDescriptionWhitespaceCharacter,
  [STATES.PARSE_ITEM]: parseItemCharacter,
  [STATES.PARSE_TITLE]: parseTitleCharacter,
};

// Parses the content within \item[<key>] <value>
function parseDefinitionItem(getCharacter: CharacterGenerator): {
  title: string;
  description: string;
} {
  const parserState: ParserState = {
    state: STATES.IDLE,
    title: "",
    description: "",
    itemIndex: 0,
  };

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return getParsedDefinition(parserState);
    }

    if (parseDefinitionCharacter(parserState, getCharacter, c)) {
      return getParsedDefinition(parserState);
    }
  }

  throw new Error("No matching expression was found");
}

function parseDefinitionCharacter(
  parserState: ParserState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  return definitionCharacterParsers[parserState.state](
    parserState,
    getCharacter,
    c,
  );
}

function parseIdle(
  parserState: ParserState,
  _getCharacter: CharacterGenerator,
  c: string,
) {
  if (c === "\\") {
    parserState.state = STATES.PARSE_ITEM;
  }

  return false;
}

function parseItemCharacter(
  parserState: ParserState,
  _getCharacter: CharacterGenerator,
  c: string,
) {
  parseItem(parserState, c);

  return false;
}

function parseItem(parserState: ParserState, c: string) {
  if (c === "[") {
    parserState.state = STATES.PARSE_TITLE;

    return;
  }

  if (ITEM_SYNTAX[parserState.itemIndex] !== c) {
    throw new Error("No matching expression was found");
  }

  parserState.itemIndex++;
}

function parseTitleCharacter(
  parserState: ParserState,
  _getCharacter: CharacterGenerator,
  c: string,
) {
  parseTitle(parserState, c);

  return false;
}

function parseTitle(parserState: ParserState, c: string) {
  if (c === "]") {
    parserState.state = STATES.PARSE_DESCRIPTION_WHITESPACE;

    return;
  }

  parserState.title += c;
}

function parseDescriptionWhitespace(
  parserState: ParserState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  if (c === " ") {
    return;
  }

  getCharacter.previous();
  parserState.state = STATES.PARSE_DESCRIPTION;
}

function parseDescriptionWhitespaceCharacter(
  parserState: ParserState,
  getCharacter: CharacterGenerator,
  c: string,
) {
  parseDescriptionWhitespace(parserState, getCharacter, c);

  return false;
}

function parseDescriptionCharacter(
  parserState: ParserState,
  _getCharacter: CharacterGenerator,
  c: string,
) {
  if (c === "\n") {
    return true;
  }

  parserState.description += c;

  return false;
}

function getParsedDefinition(parserState: ParserState): {
  title: string;
  description: string;
} {
  return {
    title: parserState.title,
    description: parserState.description,
  };
}

export { parseDefinitionItem };
