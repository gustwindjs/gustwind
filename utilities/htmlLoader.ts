import * as path from "node:path";
import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import type { GlobalUtilities } from "../types.ts";

type ParsedComponents = [
  string,
  {
    component: string;
    utilities: GlobalUtilities | undefined;
  },
][];

const initLoader = (
  { cwd, loadDir, loadModule }: {
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
  },
) => {
  return async (
    componentsPath: string,
    selection?: string[],
  ): Promise<{
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
          await Deno.lstat(p);

          utilities = await loadModule(utilitiesPath);
        } catch (_err) {
          // Nothing to do
        }

        return [
          componentName,
          {
            component: await Deno.readTextFile(p),
            utilities,
          },
        ];
      }));
    }

    return {
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
        utilities,
      }];
    }),
  );
}

export { initLoader };
