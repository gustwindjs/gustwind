import { parseExpressions } from "./parseExpressions.ts";
import { getAttributeBindings } from "./getAttributeBindings.ts";
import type { Tag } from "./parseHtmlisp.ts";
import type { Context } from "../types.ts";
import type { Utilities } from "../../breezewind/types.ts";

// Currently this contains htmlisp syntax specific logic but technically
// that could be decoupled as well.
async function astToHtml(
  ast: (string | Tag)[],
  context?: Context,
  utilities?: Utilities,
): Promise<string> {
  // console.log("ast", ast);

  return (await Promise.all(ast.map(async (tag) => {
    if (typeof tag === "string") {
      return tag;
    }

    const { name, attributes, children, isSelfClosing } = tag;
    const parsedExpressions = await parseExpressions(
      attributes,
      context || {},
      utilities || {},
    );

    if (parsedExpressions.visibleIf === false) {
      return "";
    }

    const attrs = getAttributeBindings(parsedExpressions);
    const parsedChildren = parsedExpressions.children;

    if (!parsedChildren && isSelfClosing) {
      return `<${name}${attrs}/>`;
    }

    return `<${name}${attrs}>${
      parsedChildren || await astToHtml(children)
    }</${name}>`;
  }))).join("");
}

export { astToHtml };
