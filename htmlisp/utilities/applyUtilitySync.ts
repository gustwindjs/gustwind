import { isObject } from "../../utilities/functional.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import { isRawHtml, unwrapRawHtml } from "./runtime.ts";

function applyUtilitySync<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  value: U | unknown,
  utilities: US,
  context: C,
): any {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }

  if (!value) {
    return;
  }

  // @ts-expect-error Figure out how to type this
  if (typeof value.utility !== "string") {
    if (isObject(value) && !(value instanceof Date)) {
      return Object.fromEntries(
        Object.entries(value).map((
          [k, v],
        ) => [
          k,
          applyUtilitySync(
            v,
            utilities,
            context,
          ),
        ]),
      );
    }

    return value;
  }

  // @ts-expect-error Figure out how to type this
  const foundUtility = utilities[value.utility];

  if (!foundUtility) {
    console.error({ utilities, value });
    throw new Error("applyUtility - Matching utility was not found");
  }

  // @ts-expect-error Figure out how to type this
  const parameters = Array.isArray(value.parameters)
    // @ts-expect-error Figure out how to type this
    ? value.parameters.map((p) => {
      if (typeof p === "string") {
        // Nothing to do
      } else if (p.utility && p.parameters) {
        return applyUtilitySync(p, utilities, context);
      }

      return p;
    })
    : [];

  const utilityName = (value as Utility).utility;
  const utility = foundUtility as (
    this: unknown,
    ...args: unknown[]
  ) => unknown;

  return utility.apply(
    context,
    (parameters as unknown[]).map((parameter) =>
      unwrapRawHtmlArgument(parameter, utilityName)
    ),
  );
}

export { applyUtilitySync };

function unwrapRawHtmlArgument(value: unknown, utility: string) {
  return utility === "render"
    ? value
    : isRawHtml(value)
    ? unwrapRawHtml(value)
    : value;
}
