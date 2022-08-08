import type { Context, Utilities, Utility } from "./types.ts";

async function applyUtility(
  value: Utility,
  utilities?: Utilities,
  context?: Context,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }

  const foundUtility = utilities[value.utility];

  if (!foundUtility) {
    console.error({ utilities, value });
    throw new Error("applyUtility - Matching utility was not found");
  }

  const parameters = await Promise.all(
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
  );

  return foundUtility.apply(
    null,
    [context].concat(parameters),
  );
}

export { applyUtility };
