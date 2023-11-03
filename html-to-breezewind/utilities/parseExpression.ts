import type { Utility } from "../../breezewind/types.ts";

function parseExpression(s: string) {
  const characters = s.split("");
  let ret: Utility | undefined;
  const parents: Utility[] = [];
  let parent: Utility | undefined;
  let i = 0;
  let segment = "";
  let captureEmpty = false;
  let level = 0;

  characters.forEach((character) => {
    let captureSegment = false;

    if (character === "(") {
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
    } else if (character === ")") {
      captureSegment = true;
      level--;

      if (parents.length - level > 1) {
        parents.pop();
        parent = parents.at(-1);
      }
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

      segment = "";
    }
  });

  return ret;
}

export { parseExpression };
