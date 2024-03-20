import * as states from "./states.ts";

// TODO
function* parseTagStart(value: string, c: string) {
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

  yield { value, state: states.IDLE };
}

// TODO
function* parseTagEnd(value: string, c: string) {
  /*
  if (c === ">") {
    if (input[i - 1] !== "?") {
      parsingState = PARSE_CHILDREN_START;
    } else {
      parsingState = NOT_PARSING;
    }
  }
  */

  yield { value, state: states.IDLE };
}

export { parseTagEnd, parseTagStart };
