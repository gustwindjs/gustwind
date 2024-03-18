const DEBUG = 0;

const NOT_PARSING = "not parsing";
const PARSE_TAG_START = "parse tag start";
const PARSE_CHILDREN = "parse children";
const PARSE_ATTRIBUTE_NAME = "parse attribute name";
const PARSE_ATTRIBUTE_VALUE = "parse attribute value";
const PARSE_TAG = "parse tag";
const PARSE_CHILDREN_START = "parse children start";

type Attribute = { name: string; value: string | null };
type Tag = {
  type: string;
  attributes: Attribute[];
  children: (string | Tag)[];
  closesWith?: string;
  depth: number;
};

function parseHtmlisp(input: string): Tag[] {
  let parsingState = PARSE_TAG_START;
  let quotesFound = 0;
  let currentTag: Tag = { type: "", attributes: [], children: [], depth: 0 };
  const parentTags: Tag[] = [currentTag];
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
        } else if (c === ">" && input[i - 1] !== "?") {
          parsingState = PARSE_CHILDREN_START;
        } else if (c === "/") {
          currentTag.closesWith = "/";
        }
      } else if (parsingState === PARSE_TAG_START) {
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
      } else if (parsingState === PARSE_ATTRIBUTE_NAME) {
        if (c === "=") {
          parsingState = PARSE_ATTRIBUTE_VALUE;
        } // Attribute name was not found after all
        else if (c === ">") {
          // Note that self-closing attributes can be found at the end of a tag
          if (capturedAttribute.name) {
            currentTag.attributes.push({
              name: capturedAttribute.name,
              value: null,
            });
            capturedAttribute = { name: "", value: "" };
          }

          parsingState = PARSE_CHILDREN_START;
        } else if (c === "?" || c === "/") {
          currentTag.closesWith = c;
        } // Self-closing attribute
        else if (c === " ") {
          if (capturedAttribute.name) {
            currentTag.attributes.push({
              name: capturedAttribute.name,
              value: null,
            });
            parsingState = PARSE_ATTRIBUTE_NAME;
            capturedAttribute = { name: "", value: "" };
          }
        } else {
          capturedAttribute.name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_VALUE) {
        if (c === '"') {
          quotesFound++;

          if (quotesFound === 2) {
            currentTag.attributes.push(capturedAttribute);
            parsingState = PARSE_ATTRIBUTE_NAME;
            quotesFound = 0;
            capturedAttribute = { name: "", value: "" };
          }
        } else {
          capturedAttribute.value += c;
        }
      } // The only purpose of this state is to detect when there
      // is content without whitespace so children parsing logic can kick in.
      else if (parsingState === PARSE_CHILDREN_START) {
        // DOCTYPE case
        if (currentTag.closesWith === "" || currentTag.closesWith === "?") {
          parentTags.pop();
          currentTag = {
            type: "",
            attributes: [],
            children: [],
            depth,
          };
          capturedTags.push(currentTag);
          parentTags.push(currentTag);
          parsingState = NOT_PARSING;

          // Move back a step to capture the first character when parsing
          i--;
        } else if (c !== " ") {
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
          parentTags.pop();

          // This is an end tag which we can safely skip
          parsingState = NOT_PARSING;
        } else {
          // This case should not be possible
          if (!parentTags[depth]) {
            console.error(parentTags, depth, currentTag, capturedTags);
            throw new Error("Missing parent tags!");
          }

          // Attach the new structure to the earlier parent
          currentTag = {
            type: "",
            attributes: [],
            children: [],
            depth: depth + 1,
          };

          parentTags[depth].children.push(currentTag);
          parentTags.push(currentTag);
          depth++;
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
