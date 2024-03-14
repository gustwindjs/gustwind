/*
const NOT_PARSING = 0;
const PARSE_TAG_START = 1;
const PARSE_CHILDREN = 2;
const PARSE_ATTRIBUTE_NAME = 3;
const PARSE_ATTRIBUTE_VALUE = 4;
const PARSE_TAG = 5;
*/

// Debug helpers
const NOT_PARSING = "not parsing";
const PARSE_TAG_START = "parse tag start";
const PARSE_CHILDREN = "parse children";
const PARSE_ATTRIBUTE_NAME = "parse attribute name";
const PARSE_ATTRIBUTE_VALUE = "parse attribute value";
const PARSE_TAG = "parse tag";

type Attribute = { name: string; value: string };
type Tag = {
  name: string;
  attributes: Attribute[];
  children: (string | Tag)[];
  isSelfClosing?: boolean;
};

function parseHtmlisp(input: string): Tag[] {
  let parsingState = NOT_PARSING;
  let quotesFound = 0;
  let capturedTags: Tag[] = [{
    name: "",
    attributes: [],
    children: [],
  }];
  let capturedAttribute: Attribute = { name: "", value: "" };
  let capturedBody = "";
  let tagName = "";
  let tagIndex = 0;
  const finalTags = [];

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (c !== "\n") {
      // Debug helper
      console.log(parsingState, c);

      if (parsingState === NOT_PARSING) {
        if (c === "<") {
          parsingState = PARSE_TAG_START;
        } else if (c === ">") {
          parsingState = PARSE_CHILDREN;
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
        } // Self-closing tag
        else if (c === "/") {
          const capturedTag = capturedTags.at(-1);

          if (capturedTag) {
            capturedTag.isSelfClosing = true;
            tagName = capturedTag.name;
            parsingState = PARSE_TAG;
          }
        }
      } else if (parsingState === PARSE_TAG_START) {
        if (c === ">") {
          parsingState = PARSE_CHILDREN;
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
          capturedAttribute = { name: "", value: "" };
        } // Self-closing tag
        else if (c === "/") {
          const capturedTag = capturedTags.at(-1);

          if (capturedTag) {
            capturedTag.isSelfClosing = true;
            tagName = capturedTag.name;
            parsingState = PARSE_TAG;
          }
        } else {
          capturedTags[tagIndex].name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_NAME) {
        if (c === "=") {
          parsingState = PARSE_ATTRIBUTE_VALUE;
        } // Self-closing case after all
        else if (c === "/") {
          const capturedTag = capturedTags.at(-1);

          if (capturedTag) {
            capturedTag.isSelfClosing = true;
            tagName = capturedTag.name;
            parsingState = PARSE_TAG;
          }
        } // Attribute name was not found after all
        else if (c === ">") {
          parsingState = PARSE_CHILDREN;
        } else if (c !== " ") {
          capturedAttribute.name += c;
        }
      } else if (parsingState === PARSE_ATTRIBUTE_VALUE) {
        if (c === '"') {
          quotesFound++;

          if (quotesFound === 2) {
            capturedTags[tagIndex].attributes.push(capturedAttribute);
            parsingState = NOT_PARSING;
            quotesFound = 0;
            capturedAttribute = { name: "", value: "" };
          }
        } else {
          capturedAttribute.value += c;
        }
      } else if (parsingState === PARSE_CHILDREN) {
        if (c === "<") {
          parsingState = PARSE_TAG;
        } else {
          capturedBody += c;
        }
      } // The challenge here is that it is not clear if the current tag is ending
      // or whether it has children so both options have to be considered.
      else if (parsingState === PARSE_TAG) {
        if (c === ">") {
          if (capturedTags[tagIndex].name === tagName) {
            parsingState = NOT_PARSING;

            // TODO: Check indexing here
            if (capturedBody) {
              capturedTags[0].children.push(capturedBody);
            }

            finalTags.push(structuredClone(capturedTags[0]));
            capturedTags = [{
              name: "",
              attributes: [],
              children: [],
            }];
            capturedBody = "";
            tagName = "";
            quotesFound = 0;
          } else {
            tagIndex++;
            capturedTags.push({
              name: tagName,
              attributes: [],
              children: [],
            });
            capturedBody = "";
            tagName = "";

            // Tag name was already parsed so parse children now
            parsingState = PARSE_CHILDREN;
          }
        } else if (c === "/") {
          if (tagIndex > 0) {
            const lastTag = capturedTags.pop();
            tagIndex--;

            if (lastTag) {
              lastTag.children.push(capturedBody);

              capturedTags[tagIndex].children.push(lastTag);
              parsingState = NOT_PARSING;
              capturedBody = "";
            }
          }
        } else if (c === " ") {
          parsingState = PARSE_ATTRIBUTE_NAME;
          capturedAttribute = { name: "", value: "" };
        } else {
          tagName += c;
        }
      }
    }
  }

  // TODO: Figure out why final tags don't get constructed for a complex sibling case
  console.log("final tags", finalTags, "captured tags", capturedTags);

  return finalTags;
}

export { type Attribute, parseHtmlisp, type Tag };
