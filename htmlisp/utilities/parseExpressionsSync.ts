import { parseExpression } from "./parseExpression.ts";
import { applyUtilitySync } from "./applyUtilitySync.ts";
import { isUndefined } from "../../utilities/functional.ts";
import type { Attributes, Context } from "../types.ts";
import type { Utilities, Utility } from "../../types.ts";

function parseExpressionsSync(
  attributes: Attributes | undefined,
  context: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return {};
  }

  const entries = Object.entries(attributes).map(
    ([name, value]) => {
      // Skip commented attributes
      if (name.startsWith("__")) {
        return;
      }

      // Check bindings
      if (name.startsWith("&") && value !== null) {
        const parsedExpression = parseExpression(value.toString());

        if (!parsedExpression) {
          throw new Error(`Failed to parse ${value} for attribute ${name}!`);
        }

        const evaluatedValue = applyUtilitySync<
          Utility,
          Utilities,
          Context
        >(
          parsedExpression,
          utilities,
          context,
        );

        // Filter out attributes with an undefined value
        if (name !== "&visibleIf" && isUndefined(evaluatedValue)) {
          return;
        }

        return [name.slice(1), evaluatedValue];
      }

      return [name, value];
    },
  ).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { parseExpressionsSync };
