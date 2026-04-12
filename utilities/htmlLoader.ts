import * as path from "node:path";
import type { GlobalUtilities } from "../types.ts";
import { urlJoin } from "./urlJoin.ts";
import type { ComponentSourceDefinition } from "./componentDependencyGraph.ts";

type ParsedComponents = [
  string,
  {
    component: string;
    sourcePath: string;
    utilities: GlobalUtilities | undefined;
    utilitiesPath?: string;
  },
][];

const initLoader = (
  { cwd, loadDir, loadModule, readTextFile }: {
    cwd: string;
    loadDir: (
      { path, extension, recursive, type }: {
        path: string;
        extension: string;
        recursive: boolean;
        type: string;
      },
    ) => Promise<{ name: string; path: string }[]>;
    loadModule: (path: string) => Promise<GlobalUtilities>;
    readTextFile: (path: string) => Promise<string>;
  },
) => {
  return async (
    componentsPath: string,
    selection?: string[],
  ): Promise<{
    componentDefinitions: Record<string, ComponentSourceDefinition>;
    components: Record<string, string>;
    componentUtilities: Record<string, GlobalUtilities | undefined>;
  }> => {
    const extension = ".html";
    let components: ParsedComponents = [];

    if (componentsPath.startsWith("http")) {
      if (!selection) {
        throw new Error("Remote loader is missing a selection");
      }

      components = await loadRemoteComponents(
        componentsPath,
        selection,
        extension,
      );
    } else {
      components = await Promise.all((await loadDir({
        path: path.join(cwd, componentsPath),
        extension,
        recursive: true,
        type: "components",
      })).map(async (
        { path: p },
      ) => {
        const componentName = path.basename(p, path.extname(p));
        let utilities;
        const utilitiesPath = p.replace(extension, ".server.ts");

        try {
          utilities = await loadModule(utilitiesPath);
        } catch (_err) {
          // Nothing to do
        }

        return [
          componentName,
          {
            component: await readTextFile(p),
            sourcePath: p,
            utilities,
            utilitiesPath: utilities ? utilitiesPath : undefined,
          },
        ];
      }));
    }

    return {
      componentDefinitions: Object.fromEntries(
        components.map(([k, { component, sourcePath, utilitiesPath }]) => [k, {
          htmlInput: component,
          sourcePath,
          utilitiesPath,
        }]),
      ),
      components: Object.fromEntries(
        components.map(([k, { component }]) => [k, component]),
      ),
      componentUtilities: Object.fromEntries(
        components.map(([k, { utilities }]) => [k, utilities]),
      ),
    };
  };
};

// TODO: Cache results to .gustwind to speed up operation
function loadRemoteComponents(
  componentsPath: string,
  selection: string[],
  extension: string,
): Promise<ParsedComponents> {
  return Promise.all(
    selection.map(async (componentName) => {
      let utilities;

      try {
        utilities = await import(
          urlJoin(componentsPath, componentName + ".server.ts")
        );
      } catch (_) {
        // Nothing to do
      }

      return [componentName, {
        component: await fetch(
          urlJoin(componentsPath, componentName + extension),
        ).then((res) => res.text()),
        sourcePath: urlJoin(componentsPath, componentName + extension),
        utilities,
        utilitiesPath: utilities
          ? urlJoin(componentsPath, componentName + ".server.ts")
          : undefined,
      }];
    }),
  );
}

export { initLoader };
