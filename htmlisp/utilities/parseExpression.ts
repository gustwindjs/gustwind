import { getMemo } from "../../utilities/cache.ts";
import type { Utility } from "../../types.ts";

const memo = getMemo(new Map());
function cachedParseExpression(input: string) {
  return memo(parseExpression, input);
}

function parseExpression(s: string) {
  // TODO: Test \n case
  const characters = s.replaceAll("\n", "").split("");
  let ret: Utility | undefined;
  const parents: Utility[] = [];
  let parent: Utility | undefined;
  let i = 0;
  let segment = "";
  let captureEmpty = false;
  let level = 0;

  characters.forEach((character) => {
    let captureSegment = false;

    if (character === "(" && !captureEmpty) {
      // Start capturing a segment now
      // Note that the implementation avoids recursion on purpose
      // and parent tracking is handled through references.
      const template = { utility: "", parameters: [] };

      parent?.parameters?.push(template);
      parent = template;
      parents.push(template);
      i = 0;
      level++;

      // Catch reference to the first parent
      if (!ret) {
        ret = parents.at(-1);
      }

      return;
    } else if (character === ")" && !captureEmpty) {
      captureSegment = true;
      level--;
    } else if (character === "'") {
      if (captureEmpty) {
        captureEmpty = false;
        captureSegment = true;
      } else {
        captureEmpty = true;
      }
    } else if (character === " ") {
      if (captureEmpty) {
        segment += character;
      } else {
        captureSegment = true;
      }
    } else {
      segment += character;
    }

    if (captureSegment) {
      if (!parent) {
        throw new Error(`Missing parent at ${s}`);
      }

      // First segment is a utility always. The following contain the parameters.
      if (i === 0) {
        parent.utility = segment;

        i++;
      } else if (segment.length > 0) {
        parent.parameters?.push(segment);
      }

      if (parents.length - level > 0 && parents.length > 1) {
        parents.pop();
        parent = parents.at(-1);
      }

      segment = "";
    }
  });
  return ret;
}

export { cachedParseExpression as parseExpression };
