import { parseExpression } from "./parseExpression.ts";
import { applyUtility, applyUtilitySync } from "./applyUtility.ts";
import type { Attributes, Context } from "../types.ts";
import type { Utilities, Utility } from "../../types.ts";

async function parseExpressions(
  attributes: Attributes | undefined,
  context: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return {};
  }

  const entries = (await Promise.all(
    Object.entries(attributes).map(
      async ([name, value]) => {
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

          return [
            name.slice(1),
            await applyUtility<
              Utility,
              Utilities,
              Context
            >(
              parsedExpression,
              utilities,
              context,
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

        return [
          name.slice(1),
          applyUtilitySync<
            Utility,
            Utilities,
            Context
          >(
            parsedExpression,
            utilities,
            context,
          ),
        ];
      }

      return [name, value];
    },
  ).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { parseExpressions, parseExpressionsSync };
