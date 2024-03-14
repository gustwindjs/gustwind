import { parseExpression } from "./parseExpression.ts";
import { applyUtility } from "../../breezewind/applyUtility.ts";
import type { Attribute } from "./parseHtmlisp.ts";
import type { Context } from "../types.ts";
import type { Utilities, Utility } from "../../breezewind/types.ts";

async function parseExpressions(
  attributes: Attribute[],
  context: Context,
  // props: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return {};
  }

  const entries = (await Promise.all(
    attributes.map(
      async ({ name, value }) => {
        // Skip commented attributes
        if (name.startsWith("__")) {
          return;
        }

        // Skip visibleIf
        if (name === "&visibleIf") {
          return;
        }

        // Check bindings
        if (name.startsWith("&")) {
          const parsedExpression = parseExpression(value);

          // TODO: Test this case
          if (!parsedExpression) {
            throw new Error(`Failed to parse ${value} for attribute ${name}!`);
          }

          return [
            name.slice(1),
            await applyUtility<
              Utility,
              Utilities,
              Context
            >(
              parsedExpression,
              utilities,
              { context }, // { context, props },
            ),
          ];
        }

        return [name, value];
      },
    ),
  )).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { parseExpressions };
