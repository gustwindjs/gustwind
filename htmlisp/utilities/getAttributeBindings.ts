import { omit } from "../../utilities/functional.ts";
import { parseExpressions } from "./parseExpressions.ts";
import type { HtmlispRenderOptions } from "../types.ts";
import { renderAttributeValue } from "./runtime.ts";

function getAttributeBindings(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
  renderOptions?: HtmlispRenderOptions,
) {
  const explicitAttributes = omit(
    omit(omit(parsedExpressions, "children"), "visibleIf"),
    "attrs",
  );
  const extraAttributes = parsedExpressions.attrs;
  const serializedAttributes: [string, string | boolean][] = [];

  if (extraAttributes && typeof extraAttributes === "object") {
    for (const [key, value] of Object.entries(extraAttributes)) {
      if (Object.hasOwn(explicitAttributes, key)) {
        continue;
      }

      const rendered = renderAttributeValue(value, renderOptions);

      if (typeof rendered !== "undefined") {
        serializedAttributes.push([key, rendered]);
      }
    }
  }

  for (const [key, value] of Object.entries(explicitAttributes)) {
    const rendered = renderAttributeValue(value, renderOptions);

    if (typeof rendered !== "undefined") {
      serializedAttributes.push([key, rendered]);
    }
  }

  const ret = serializedAttributes.map(([key, value]) =>
    typeof value === "string" ? `${key}="${value}"` : key
  ).join(" ");

  if (ret.length) {
    return " " + ret;
  }

  return "";
}

export { getAttributeBindings };
