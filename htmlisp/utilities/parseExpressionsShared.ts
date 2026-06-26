import { isUndefined } from "../../utilities/functional.ts";
import type { ForeachBinding } from "../types.ts";
import { parseBoundExpression } from "./parseBoundExpression.ts";
import { parseForeachExpression } from "./parseForeachExpression.ts";

function shouldSkipAttribute(name: string) {
  return name.startsWith("__");
}

function isBoundAttribute(name: string, value: unknown) {
  return name.startsWith("&") && value !== null;
}

function parseForeachAttribute(name: string, value: unknown) {
  const parsedForeach = parseForeachExpression(value?.toString() || "");

  if (!parsedForeach) {
    throw new Error(`Failed to parse ${value} for attribute ${name}!`);
  }

  return parsedForeach;
}

function parseBoundAttribute(name: string, value: unknown) {
  const parsedExpression = parseBoundExpression(value?.toString() || "");

  if (!parsedExpression) {
    throw new Error(`Failed to parse ${value} for attribute ${name}!`);
  }

  return parsedExpression;
}

function createForeachBinding(
  evaluatedItems: unknown,
  alias?: string,
): ForeachBinding | undefined {
  if (isUndefined(evaluatedItems)) {
    return;
  }

  return {
    items: evaluatedItems as unknown[],
    alias,
  };
}

function createEvaluatedAttribute(
  name: string,
  evaluatedValue: unknown,
) {
  if (name !== "&visibleIf" && isUndefined(evaluatedValue)) {
    return;
  }

  return [name.slice(1), evaluatedValue];
}

function parseStaticAttribute(name: string, value: unknown) {
  return [name, value];
}

export {
  createEvaluatedAttribute,
  createForeachBinding,
  isBoundAttribute,
  parseBoundAttribute,
  parseForeachAttribute,
  parseStaticAttribute,
  shouldSkipAttribute,
};
