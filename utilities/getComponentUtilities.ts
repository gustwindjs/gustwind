import type { Utilities } from "../breezewind/types.ts";
import type { Components } from "../utilities/loaders.ts";
import type { Routes } from "../types.ts";

// https://stackoverflow.com/a/47636222/228885
function getComponentUtilities(
  components: Components,
  routes: Routes,
): Record<string, Utilities> {
  return Object.fromEntries(
    Object.entries(components).map(([k, v]) =>
      v.utilities && [k, v.utilities.init({ routes })]
    )
      .filter(<T>(n?: T): n is T => Boolean(n)),
  );
}

export { getComponentUtilities };
