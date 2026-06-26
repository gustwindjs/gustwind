import type { CharacterGenerator } from "../../types.ts";

const STATES = {
  IDLE: "IDLE",
  PARSE_ITEM: "PARSE_ITEM",
  PARSE_CONTENT: "PARSE_CONTENT",
} as const;
type State = typeof STATES[keyof typeof STATES];
type ListItemParseState = {
  state: State;
  stringBuffer: string;
  itemIndex: number;
};

const LIMIT = 100000;
const ITEM_SYNTAX = "item";

// Parses the content following \item
function parseListItem(
  getCharacter: CharacterGenerator,
): string {
  const parseState: ListItemParseState = {
    state: STATES.IDLE,
    stringBuffer: "",
    itemIndex: 0,
  };

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return parseState.stringBuffer;
    }

    const result = parseListItemCharacter(parseState, c);

    if (result.done) {
      return parseState.stringBuffer;
    }
  }

  throw new Error("No matching expression was found");
}

function parseListItemCharacter(
  parseState: ListItemParseState,
  c: string,
) {
  switch (parseState.state) {
    case STATES.IDLE:
      parseIdle(parseState, c);
      break;
    case STATES.PARSE_ITEM:
      parseItemSyntax(parseState, c);
      break;
    case STATES.PARSE_CONTENT:
      return parseContent(parseState, c);
  }

  return { done: false };
}

function parseIdle(parseState: ListItemParseState, c: string) {
  if (startsItemSyntax(c)) {
    parseState.state = STATES.PARSE_ITEM;
  } else {
    parseState.stringBuffer += c;
  }
}

function parseItemSyntax(parseState: ListItemParseState, c: string) {
  if (endsItemSyntax(c)) {
    parseState.stringBuffer = "";
    parseState.state = STATES.PARSE_CONTENT;

    return;
  }

  assertItemSyntax(c, parseState.itemIndex);
  parseState.itemIndex++;
  parseState.stringBuffer += c;
}

function parseContent(parseState: ListItemParseState, c: string) {
  if (endsItemContent(c)) {
    return { done: true };
  }

  parseState.stringBuffer += c;

  return { done: false };
}

function startsItemSyntax(c: string) {
  return c === "\\";
}

function endsItemSyntax(c: string) {
  return c === " ";
}

function endsItemContent(c: string) {
  return c === "\n";
}

function assertItemSyntax(c: string, itemIndex: number) {
  if (ITEM_SYNTAX[itemIndex] !== c) {
    throw new Error("No matching expression was found");
  }
}

export { parseListItem };
