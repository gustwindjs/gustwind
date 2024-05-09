import { isObject } from "../../utilities/functional.ts";
import type { Context, Utilities, Utility } from "../../types.ts";

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

  // @ts-expect-error This is fine for now.
  // TODO: Figure out a nice way to resolve context mismatch
  return foundUtility.apply(context, parameters);
}

export { applyUtilitySync };
