import { applyUtilitySync } from "./applyUtilitySync.ts";
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

export { applyUtilitiesSync };
