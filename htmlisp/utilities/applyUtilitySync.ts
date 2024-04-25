import type { Context, Utilities, Utility } from "../../types.ts";

function applyUtilitiesSync<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  props: Record<string, U> | null,
  utilities: US,
  context: C,
): Record<string, unknown> {
  if (!props) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(props).map((
      [k, v],
    ) => [
      k,
      typeof v === "string" ? v : applyUtilitySync<U, US, C>(
        v,
        utilities,
        context,
      ),
    ]),
  );
}

function applyUtilitySync<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  value: U,
  utilities: US,
  context: C,
): any {
  if (!utilities) {
    throw new Error("applyUtility - No utilities were provided");
  }

  if (!value) {
    return;
  }

  if (typeof value.utility !== "string") {
    return;
  }

  const foundUtility = utilities[value.utility];

  if (!foundUtility) {
    console.error({ utilities, value });
    throw new Error("applyUtility - Matching utility was not found");
  }

  const parameters = Array.isArray(value.parameters)
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

export { applyUtilitiesSync, applyUtilitySync };
