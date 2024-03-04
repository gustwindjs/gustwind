import type { Component } from "../breezewind/types.ts";
import type { Components } from "../types.ts";

function getComponents(
  components: Components,
): Record<string, Component> {
  return Object.fromEntries(
    Object.entries(components).map(([k, v]) => [k, v.component]),
  );
}

export { getComponents };
