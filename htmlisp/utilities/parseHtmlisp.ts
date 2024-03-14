/*
const NOT_PARSING = 0;
const PARSE_TAG_START = 1;
const PARSE_CHILDREN = 2;
const PARSE_ATTRIBUTE_NAME = 3;
const PARSE_ATTRIBUTE_VALUE = 4;
const PARSE_TAG = 5;
const PARSE_CHILDREN_START = 6;
*/

// Debug helpers
const NOT_PARSING = "not parsing";
const PARSE_TAG_START = "parse tag start";
const PARSE_CHILDREN = "parse children";
const PARSE_ATTRIBUTE_NAME = "parse attribute name";
const PARSE_ATTRIBUTE_VALUE = "parse attribute value";
const PARSE_TAG = "parse tag";
const PARSE_CHILDREN_START = "parse children start";

const DEBUG = 0;

type Attribute = { name: string; value: string };
type Tag = {
  name: string;
  attributes: Attribute[];
  children: (string | Tag)[];
  isSelfClosing?: boolean;
};

function parseHtmlisp(input: string): Tag[] {
  let parsingState = PARSE_TAG_START;
  let quotesFound = 0;
  let capturedTag: Tag = { name: "", attributes: [], children: [] };
  let parentTag: Tag = capturedTag;
  const capturedTags: Tag[] = [capturedTag];
  let capturedAttribute: Attribute = { name: "", value: "" };
  let capturedBody = "";

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (c !== "\n") {
      if (DEBUG) {
        console.log(parsingState, c, capturedTag, capturedBody);
      }

      if (parsingState === NOT_PARSING) {
        if (c === "<") {
          parsingState = PARSE_TAG_START;
        } else if (c === ">") {
          parsingState = PARSE_CHILDREN_START;
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
        }
      } else if (parsingState === PARSE_TAG_START) {
        if (c === ">") {
          parsingState = PARSE_CHILDREN_START;
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
        } else if (c !== "<") {
          capturedTag.name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_NAME) {
        if (c === "=") {
          parsingState = PARSE_ATTRIBUTE_VALUE;
        } // Attribute name was not found after all
        else if (c === ">") {
          parsingState = PARSE_CHILDREN_START;
        } else if (c !== " ") {
          capturedAttribute.name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_VALUE) {
        if (c === '"') {
          quotesFound++;

          if (quotesFound === 2) {
            capturedTag.attributes.push(capturedAttribute);
            parsingState = NOT_PARSING;
            quotesFound = 0;
            capturedAttribute = { name: "", value: "" };
          }
        } else {
          capturedAttribute.value += c;
        }
      } // The only purpose of this state is to detect when there
      // is content without whitespace so children parsing logic can kick in.
      else if (parsingState === PARSE_CHILDREN_START) {
        if (c !== " ") {
          parsingState = PARSE_CHILDREN;

          // Move back a step to capture the first character when parsing
          i--;
        }
      } else if (parsingState === PARSE_CHILDREN) {
        if (c === "<") {
          parsingState = PARSE_TAG;

          // Reached next tag so store the body to the tag
          capturedTag.children.push(capturedBody);
          capturedBody = "";
        } else {
          capturedBody += c;
        }
      } // The challenge here is that it is not clear if the current tag is ending
      // or whether it has children so both options have to be considered.
      else if (parsingState === PARSE_TAG) {
        if (c === ">") {
          parsingState = PARSE_CHILDREN_START;
        } else if (c === "/") {
          // This is an end tag which we can safely skip
          parsingState = NOT_PARSING;
        } else {
          // Attach the new structure to the earlier parent and make it the new parent
          capturedTag = { name: "", attributes: [], children: [] };
          parentTag.children.push(capturedTag);
          parentTag = capturedTag;

          parsingState = PARSE_TAG_START;

          // Move back a step to capture the first character of the tag
          i--;
        }
      }
    }
  }

  if (DEBUG) {
    console.log("captured tags", JSON.stringify(capturedTags, null, 2));
  }

  return capturedTags;
}

export { type Attribute, parseHtmlisp, type Tag };
