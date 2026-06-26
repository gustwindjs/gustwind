import { applyUtilitySync } from "./applyUtilitySync.ts";
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

function parseExpressionsSync(
  attributes: Attributes | undefined,
  context: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return {};
  }

  const entries = Object.entries(attributes).map(([name, value]) =>
    parseExpressionEntry(name, value, context, utilities)
  ).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

function parseExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  if (shouldSkipAttribute(name)) {
    return;
  }

  return isBoundAttribute(name, value)
    ? parseBoundExpressionEntry(name, value, context, utilities)
    : parseStaticAttribute(name, value);
}

function parseBoundExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  return name === "&foreach"
    ? parseForeachExpressionEntry(name, value, context, utilities)
    : parseEvaluatedExpressionEntry(name, value, context, utilities);
}

function parseForeachExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  const parsedForeach = parseForeachAttribute(name, value);
  const evaluatedItems = applyUtilitySync<Utility, Utilities, Context>(
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

function parseEvaluatedExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  const parsedExpression = parseBoundAttribute(name, value);
  const evaluatedValue = applyUtilitySync<Utility, Utilities, Context>(
    parsedExpression,
    utilities,
    context,
  );

  return createEvaluatedAttribute(name, evaluatedValue);
}

export { parseExpressionsSync };
