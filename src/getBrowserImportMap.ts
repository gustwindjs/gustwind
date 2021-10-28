import type { ImportMap, ProjectMeta } from "../types.ts";

function getBrowserImportMap(
  browserDependencies: ProjectMeta["browserDependencies"],
  importMap: ImportMap,
) {
  if (!browserDependencies) {
    return { imports: {} };
  }

  return {
    imports: Object.fromEntries(
      Object.entries(importMap.imports).map(([k, v]) =>
        browserDependencies.includes(k) ? [k, v] : [false, v]
      ),
    ),
  };
}

export { getBrowserImportMap };
