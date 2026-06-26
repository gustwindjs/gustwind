import { applyUtility } from "./applyUtility.ts";
import type { Attributes, Context } from "../types.ts";
import type { Utilities, Utility } from "../../types.ts";
import {
  createEvaluatedAttribute,
  createForeachBinding,
  isBoundAttribute,
  parseBoundAttribute,
  parseForeachAttribute,
  parseStaticAttribute,
  shouldSkipAttribute,
} from "./parseExpressionsShared.ts";

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
        if (shouldSkipAttribute(name)) {
          return;
        }

        if (isBoundAttribute(name, value)) {
          if (name === "&foreach") {
            const parsedForeach = parseForeachAttribute(name, value);
            const evaluatedItems = await applyUtility<
              Utility,
              Utilities,
              Context
            >(
              parsedForeach.expression,
              utilities,
              context,
            );

            const foreachBinding = createForeachBinding(
              evaluatedItems,
              parsedForeach.alias,
            );

            return foreachBinding ? [name.slice(1), foreachBinding] : undefined;
          }

          const parsedExpression = parseBoundAttribute(name, value);
          const evaluatedValue = await applyUtility<
            Utility,
            Utilities,
            Context
          >(
            parsedExpression,
            utilities,
            context,
          );

          return createEvaluatedAttribute(name, evaluatedValue);
        }

        return parseStaticAttribute(name, value);
      },
    ),
  )).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { parseExpressions };
