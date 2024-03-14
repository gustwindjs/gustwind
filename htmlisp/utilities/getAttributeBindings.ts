import { omit } from "../../utilities/functional.ts";
import { parseExpressions } from "./parseExpressions.ts";

function getAttributeBindings(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
) {
  const ret = Object.entries(omit(omit(parsedExpressions, "children"), "type"))
    .map((
      [k, v],
    ) => `${k}="${v}"`)
    .join(" ");

  if (ret.length) {
    return " " + ret;
  }

  return "";
}

export { getAttributeBindings };
