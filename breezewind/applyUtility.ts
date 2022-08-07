import type { Context, Utilities, Utility } from "./types.ts";

function applyUtility(
  value: Utility,
  utilities?: Utilities,
  context?: Context,
) {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }

  return utilities[value.utility].apply(
    null,
    [context].concat(
      Array.isArray(value.parameters)
        ? value.parameters.map((p) => {
          // @ts-expect-error This is ok
          if (p.context && p.property) {
            // @ts-expect-error This is ok
            return get(get(context, p.context), p.property, p["default"]);
          }

          return p;
        })
        : [],
    ),
  );
}

export { applyUtility };
