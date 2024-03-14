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

const DEBUG = 1;

type Attribute = { name: string; value: string };
type Tag = {
  name: string;
  attributes: Attribute[];
  children: (string | Tag)[];
  isSelfClosing?: boolean;
  depth: number;
};

function parseHtmlisp(input: string): Tag[] {
  let parsingState = PARSE_TAG_START;
  let quotesFound = 0;
  let currentTag: Tag = { name: "", attributes: [], children: [], depth: 0 };
  // TODO: This has to become parentTags
  let parentTag: Tag = currentTag;
  const capturedTags: Tag[] = [currentTag];
  let capturedAttribute: Attribute = { name: "", value: "" };
  let capturedBody = "";
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (c !== "\n") {
      if (DEBUG) {
        console.log(parsingState, c, currentTag, capturedBody);
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
          currentTag.name += c;
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
            currentTag.attributes.push(capturedAttribute);
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
          capturedBody && currentTag.children.push(capturedBody);
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
          depth--;

          // This is an end tag which we can safely skip
          parsingState = NOT_PARSING;
        } else {
          depth++;

          // Attach the new structure to the earlier parent
          currentTag = { name: "", attributes: [], children: [], depth };
          parentTag.children.push(currentTag);

          console.log("XDDD", depth, parentTag.depth);

          // Direct sibling
          if (depth - parentTag.depth === 1) {
            parentTag = currentTag;
          } // Sibling case
          else {
            // TODO: Set as parent of parent - this means tracking parents somehow
            // parentTag = parentTag.parent;
          }

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
