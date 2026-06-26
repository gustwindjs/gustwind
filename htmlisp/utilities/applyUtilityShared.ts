import { isObject } from "../../utilities/functional.ts";
import type { Utilities, Utility } from "../../types.ts";
import { isRawHtml, unwrapRawHtml } from "./runtime.ts";

function assertUtilities(utilities: Utilities) {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }
}

function isUtilityCall(value: unknown): value is Utility {
  return typeof (value as Partial<Utility> | undefined)?.utility === "string";
}

function shouldResolveObject(value: unknown) {
  return isObject(value) && !(value instanceof Date);
}

function getUtility(utilities: Utilities, value: Utility) {
  const foundUtility = utilities[value.utility];

  if (!foundUtility) {
    console.error({ utilities, value });
    throw new Error("applyUtility - Matching utility was not found");
  }

  return foundUtility as (
    this: unknown,
    ...args: unknown[]
  ) => unknown;
}

function getUtilityParameters(value: Utility) {
  return Array.isArray(value.parameters) ? value.parameters : [];
}

function isNestedUtilityParameter(value: unknown): value is Utility {
  return isUtilityCall(value) && Array.isArray(value.parameters);
}

function unwrapUtilityArguments(parameters: unknown[], utility: string) {
  return parameters.map((parameter) =>
    unwrapRawHtmlArgument(parameter, utility)
  );
}

function unwrapRawHtmlArgument(value: unknown, utility: string) {
  return utility === "render"
    ? value
    : isRawHtml(value)
    ? unwrapRawHtml(value)
    : value;
}

export {
  assertUtilities,
  getUtility,
  getUtilityParameters,
  isNestedUtilityParameter,
  isUtilityCall,
  shouldResolveObject,
  unwrapUtilityArguments,
};
