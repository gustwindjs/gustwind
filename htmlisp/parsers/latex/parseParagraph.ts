import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_NAMED_LINK_URL,
  PARSE_NAMED_LINK_CONTENT,
  PARSE_MONOSPACE,
  PARSE_BOLD,
  PARSE_ITALIC,
  PARSE_SIMPLE_LINK,
  PARSE_BLOCK_START,
  PARSE_BLOCK_CONTENT,
  PARSE_BLOCK_END,
}
const LIMIT = 100000;

function parseParagraph(
  getCharacter: CharacterGenerator,
): Element[] {
  let state = STATES.IDLE;
  const ret = [];
  let currentTag: Element | null = null;
  let stringBuffer = "";
  let href = "";
  let blockName = "";
  let blockContent = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (c === "\\") {
        if (stringBuffer) {
          const tag = {
            type: "p",
            attributes: {},
            children: [stringBuffer.trim()],
          };
          ret.push(tag);
          currentTag = tag;
        }

        stringBuffer = "";
        state = STATES.PARSE_EXPRESSION;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_EXPRESSION) {
      if (c === "{") {
        if (stringBuffer === "url") {
          stringBuffer = "";
          state = STATES.PARSE_SIMPLE_LINK;
        } else if (stringBuffer === "texttt") {
          stringBuffer = "";
          state = STATES.PARSE_MONOSPACE;
        } else if (stringBuffer === "textbf") {
          stringBuffer = "";
          state = STATES.PARSE_BOLD;
        } else if (stringBuffer === "textit") {
          stringBuffer = "";
          state = STATES.PARSE_ITALIC;
        } else if (stringBuffer === "href") {
          stringBuffer = "";
          state = STATES.PARSE_NAMED_LINK_URL;
        } else if (stringBuffer === "begin") {
          stringBuffer = "";
          state = STATES.PARSE_BLOCK_START;
        } else if (stringBuffer === "end") {
          stringBuffer = "";
          state = STATES.PARSE_BLOCK_END;
        } else {
          throw new Error(`Unknown expression: ${stringBuffer}`);
        }
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_NAMED_LINK_URL) {
      if (c === "}") {
        if (!currentTag) {
          throw new Error("Missing current tag");
        }

        href = stringBuffer;
        stringBuffer = "";
        state = STATES.PARSE_NAMED_LINK_CONTENT;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_NAMED_LINK_CONTENT) {
      if (c === "{") {
        if (stringBuffer.length) {
          throw new Error("Invalid named link syntax");
        }
      } else if (c === "}") {
        if (!currentTag) {
          throw new Error("Missing current tag");
        }

        currentTag.children.push({
          type: "a",
          attributes: { href },
          children: [stringBuffer],
        });
        href = "";
        stringBuffer = "";
        state = STATES.IDLE;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_SIMPLE_LINK) {
      const o = parseExpression(c, currentTag, stringBuffer, "a", {
        href: stringBuffer,
      });

      stringBuffer = o.stringBuffer;
      if (o.state) {
        state = o.state;
      }
    } else if (state === STATES.PARSE_BOLD) {
      const o = parseExpression(c, currentTag, stringBuffer, "b", {});

      stringBuffer = o.stringBuffer;
      if (o.state) {
        state = o.state;
      }
    } else if (state === STATES.PARSE_ITALIC) {
      const o = parseExpression(c, currentTag, stringBuffer, "i", {});

      stringBuffer = o.stringBuffer;
      if (o.state) {
        state = o.state;
      }
    } else if (state === STATES.PARSE_MONOSPACE) {
      const o = parseExpression(c, currentTag, stringBuffer, "code", {});

      stringBuffer = o.stringBuffer;
      if (o.state) {
        state = o.state;
      }
    } else if (state === STATES.PARSE_BLOCK_START) {
      if (c === "}") {
        blockName = stringBuffer;
        stringBuffer = "";

        state = STATES.PARSE_BLOCK_CONTENT;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_BLOCK_CONTENT) {
      if (c === "\\") {
        blockContent = stringBuffer;
        stringBuffer = "";
        state = STATES.PARSE_EXPRESSION;
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_BLOCK_END) {
      if (c === "}") {
        if (blockName !== stringBuffer) {
          console.log(blockName, stringBuffer);
          throw new Error("Block start and end name did not match");
        }

        currentTag = {
          type: "pre", // TODO: Map verbatim to pre etc.
          attributes: {},
          children: [blockContent.trim()],
        };
        ret.push(currentTag);

        stringBuffer = "";
        state = STATES.IDLE;
      } else {
        stringBuffer += c;
      }
    }
  }

  if (stringBuffer) {
    ret.push({ type: "p", attributes: {}, children: [stringBuffer.trim()] });
  }

  return ret;
}

function parseExpression(
  c: string,
  currentTag: Element | null,
  stringBuffer: string,
  type: string,
  attributes: Record<string, string>,
) {
  if (c === "}") {
    if (!currentTag) {
      throw new Error("Missing current tag");
    }

    currentTag.children.push({
      type,
      attributes,
      children: [stringBuffer],
    });
    stringBuffer = "";

    return { stringBuffer: "", state: STATES.IDLE };
  }

  return { stringBuffer: stringBuffer + c };
}

export { parseParagraph };
