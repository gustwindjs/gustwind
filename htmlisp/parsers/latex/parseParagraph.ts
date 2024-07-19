import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

enum STATES {
  IDLE,
  PARSE_EXPRESSION,
  PARSE_SIMPLE_LINK,
}
const LIMIT = 100000;

function parseParagraph(
  getCharacter: CharacterGenerator,
): Element[] {
  let state = STATES.IDLE;
  const ret = [];
  let currentTag: Element | null = null;
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (state === STATES.IDLE) {
      if (c === "\\") {
        console.log("got backslash");

        const tag = { type: "p", attributes: {}, children: [stringBuffer] };
        ret.push(tag);
        currentTag = tag;
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
        } else {
          throw new Error(`Unknown expression: ${stringBuffer}`);
        }
      } else {
        stringBuffer += c;
      }
    } else if (state === STATES.PARSE_SIMPLE_LINK) {
      if (c === "}") {
        if (!currentTag) {
          throw new Error("Missing current tag");
        }

        currentTag.children.push({
          type: "a",
          attributes: { href: stringBuffer },
          children: [stringBuffer],
        });
        stringBuffer = "";
        state = STATES.IDLE;
      } else {
        stringBuffer += c;
      }
    }
  }

  if (stringBuffer) {
    ret.push({ type: "p", attributes: {}, children: [stringBuffer] });
  }

  return ret;
}

export { parseParagraph };
