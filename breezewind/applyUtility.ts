import type { Context, Utilities, Utility } from "./types.ts";

function applyUtility(
  value: Utility,
  utilities?: Utilities,
  context?: Context,
  // deno-lint-ignore no-explicit-any
): any {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }

  const foundUtility = utilities[value.utility];

  if (!foundUtility) {
    throw new Error("applyUtility - Matching utility was not found");
  }

  return foundUtility.apply(
    null,
    [context].concat(
      Array.isArray(value.parameters)
        ? value.parameters.map((p) => {
          if (typeof p === "string") {
            // Nothing to do
          } else if (p.utility && p.parameters) {
            return applyUtility(p, utilities, context);
          }

          return p;
        })
        : [],
    ),
  );
}

export { applyUtility };
