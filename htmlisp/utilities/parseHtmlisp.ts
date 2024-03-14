/*
const NOT_PARSING = 0;
const PARSE_TAG_START = 1;
const PARSE_BODY = 2;
const PARSE_ATTRIBUTE_NAME = 3;
const PARSE_ATTRIBUTE_VALUE = 4;
const PARSE_TAG_END = 5;
*/

// Debug helpers
const NOT_PARSING = "not parsing";
const PARSE_TAG_START = "parse tag start";
const PARSE_BODY = "parse body";
const PARSE_ATTRIBUTE_NAME = "parse attribute name";
const PARSE_ATTRIBUTE_VALUE = "parse attribute value";
const PARSE_TAG_END = "parse tag end";

type Attribute = { name: string; value: string };

function parseHtmlisp(input: string) {
  let parsingState = NOT_PARSING;
  let quotesFound = 0;
  let capturedTag: {
    name: string;
    attributes: Attribute[];
    // TODO: Potentially add children here
    children: string;
  } = { name: "", attributes: [], children: "" };
  let capturedAttribute: Attribute = { name: "", value: "" };
  const capturedTags = [];

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    // Debug helper
    // console.log(parsingState, c);

    if (parsingState === NOT_PARSING) {
      if (c === "<") {
        parsingState = PARSE_TAG_START;
      } else if (c === ">") {
        parsingState = PARSE_BODY;
      }
    } else if (parsingState === PARSE_TAG_START) {
      if (c === ">") {
        parsingState = PARSE_BODY;
      } else if (c === " ") {
        parsingState = PARSE_ATTRIBUTE_NAME;
        capturedAttribute = { name: "", value: "" };
      } else {
        capturedTag.name += c;
      }
    } else if (parsingState === PARSE_ATTRIBUTE_NAME) {
      if (c === "=") {
        parsingState = PARSE_ATTRIBUTE_VALUE;
      } else {
        capturedAttribute.name += c;
      }
    } else if (parsingState === PARSE_ATTRIBUTE_VALUE) {
      if (c === '"') {
        quotesFound++;

        if (quotesFound === 2) {
          capturedTag.attributes.push(capturedAttribute);
          parsingState = NOT_PARSING;
          quotesFound = 0;
        }
      } else {
        capturedAttribute.value += c;
      }
    } else if (parsingState === PARSE_BODY) {
      if (c === "<") {
        parsingState = PARSE_TAG_END;
      } else {
        capturedTag.children += c;
      }
    } else if (parsingState === PARSE_TAG_END) {
      if (c === ">") {
        parsingState = NOT_PARSING;
        capturedTags.push(structuredClone(capturedTag));
        capturedTag = {
          name: "",
          attributes: [],
          children: "",
        };
        quotesFound = 0;
      }
    }
  }

  return capturedTags;
}

export { parseHtmlisp };
