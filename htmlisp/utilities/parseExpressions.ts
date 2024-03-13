import { parseExpression } from "./parseExpression.ts";
import { applyUtility } from "../../breezewind/applyUtility.ts";
import type { Attributes, Context } from "../types.ts";
import type { Utilities, Utility } from "../../breezewind/types.ts";

async function parseExpressions(
  attributes: Attributes,
  context: Context,
  props: Context,
  utilities: Utilities,
  evaluateProps: boolean,
) {
  if (!attributes) {
    return {};
  }

  const entries = (await Promise.all(
    Object.entries(attributes).map(
      async ([k, v]) => {
        // Skip commented attributes
        if (k.startsWith("__")) {
          return;
        }

        // Skip visibleIf
        if (k === "&visibleIf") {
          return;
        }

        // Check bindings
        if (k.startsWith("&") || (evaluateProps && k.startsWith("#"))) {
          const parsedExpression = parseExpression(v);

          // TODO: Test this case
          if (!parsedExpression) {
            throw new Error(`Failed to parse ${v} for attribute ${k}!`);
          }

          return [
            k.slice(1),
            await applyUtility<
              Utility,
              Utilities,
              Context
            >(
              parsedExpression,
              utilities,
              { context, props },
            ),
          ];
        }

        return [k, v];
      },
    ),
  )).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { parseExpressions };
