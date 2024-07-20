import { STATES } from "./states.ts";
import type { Element } from "../../types.ts";

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

export { parseExpression };
