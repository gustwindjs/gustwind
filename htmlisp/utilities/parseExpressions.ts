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
    Object.entries(attributes).map(([name, value]) =>
      parseExpressionEntry(name, value, context, utilities)
    ),
  )).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

async function parseExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  if (shouldSkipAttribute(name)) {
    return;
  }

  return isBoundAttribute(name, value)
    ? await parseBoundExpressionEntry(name, value, context, utilities)
    : parseStaticAttribute(name, value);
}

async function parseBoundExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  return name === "&foreach"
    ? await parseForeachExpressionEntry(name, value, context, utilities)
    : await parseEvaluatedExpressionEntry(name, value, context, utilities);
}

async function parseForeachExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  const parsedForeach = parseForeachAttribute(name, value);
  const evaluatedItems = await applyUtility<Utility, Utilities, Context>(
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

async function parseEvaluatedExpressionEntry(
  name: string,
  value: unknown,
  context: Context,
  utilities: Utilities,
) {
  const parsedExpression = parseBoundAttribute(name, value);
  const evaluatedValue = await applyUtility<Utility, Utilities, Context>(
    parsedExpression,
    utilities,
    context,
  );

  return createEvaluatedAttribute(name, evaluatedValue);
}

export { parseExpressions };
