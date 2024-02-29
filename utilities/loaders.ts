import * as path from "node:path";
import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { htmlToBreezewind } from "../htmlisp/mod.ts";
import type { Components, ComponentsEntry, GlobalUtilities } from "../types.ts";

type Loader = "html" | "json";

const initLoaders = (
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
  return {
    html: async (
      componentsPath: string,
      selection?: string[],
    ): Promise<Components> => {
      const extension = ".html";
      let components = {};

      if (componentsPath.startsWith("http")) {
        if (!selection) {
          throw new Error("Remote loader is missing a selection");
        }

        components = await loadRemoteComponents(
          componentsPath,
          selection,
          extension,
          htmlToBreezewind,
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
          let utilitiesPath = p.replace(extension, ".server.ts");

          try {
            await Deno.lstat(p);

            utilities = await loadModule(utilitiesPath);
          } catch (_) {
            // No utilities were found so get rid of the path
            utilitiesPath = "";
          }

          return [
            componentName,
            {
              component: htmlToBreezewind(await Deno.readTextFile(p)),
              utilities,
              utilitiesPath,
            },
          ];
        }));
      }

      return Object.fromEntries<ComponentsEntry>(
        // @ts-expect-error The type is wrong here. Likely htmToBreezewind needs a fix.
        components,
      );
    },
    json: async (
      componentsPath: string,
      selection?: string[],
    ): Promise<Components> => {
      const extension = ".json";
      let components = {};

      if (componentsPath.startsWith("http")) {
        if (!selection) {
          throw new Error("Remote loader is missing a selection");
        }

        components = await loadRemoteComponents(
          componentsPath,
          selection,
          extension,
          JSON.parse,
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
          let utilitiesPath = p.replace(extension, ".server.ts");

          try {
            await Deno.lstat(p);

            utilities = await loadModule(utilitiesPath);
          } catch (_) {
            // No utilities were found so get rid of the path
            utilitiesPath = "";
          }

          return [
            componentName,
            {
              component: await Deno.readTextFile(p).then((d) => JSON.parse(d)),
              utilities,
              utilitiesPath,
            },
          ];
        }));
      }

      return Object.fromEntries<ComponentsEntry>(
        // @ts-expect-error The type is wrong here
        components,
      );
    },
  };
};

// TODO: Cache results to .gustwind to speed up operation
function loadRemoteComponents(
  componentsPath: string,
  selection: string[],
  extension: string,
  componentHandler: (input: string) => unknown,
) {
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
        ).then(
          (
            res,
          ) => res.text(),
        ).then(componentHandler),
        utilities,
      }];
    }),
  );
}

export { initLoaders, type Loader };
