import { applyUtility } from "./applyUtility.ts";
import type { Context, Utilities, Utility } from "../../types.ts";

async function applyUtilities<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  props: Record<string, U> | null,
  utilities: US,
  context: C,
): Promise<Record<string, unknown>> {
  if (!props) {
    return {};
  }

  return Object.fromEntries(
    await Promise.all(
      Object.entries(props).map(async (
        [k, v],
      ) => [
        k,
        typeof v === "string" ? v : await applyUtility<U, US, C>(
          v,
          utilities,
          context,
        ),
      ]),
    ),
  );
}

export { applyUtilities };
