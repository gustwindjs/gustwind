import { htmlToBreezewind } from "../htmlisp/mod.ts";
import type {
  Components as BreezewindComponents,
} from "../breezewind/types.ts";
import type { Components as GustwindComponents } from "../types.ts";

function getComponents(
  components: GustwindComponents,
): BreezewindComponents {
  return Object.fromEntries(
    Object.entries(components).map((
      [k, v],
    ) => [k, htmlToBreezewind(v.component)]),
  );
}

export { getComponents };
