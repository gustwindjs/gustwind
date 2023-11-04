import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { path } from "../server-deps.ts";
import { getJson } from "./fs.ts";
import { htmlToBreezewind } from "../html-to-breezewind/mod.ts";
import type { Component } from "../breezewind/types.ts";
import type { PageUtilities } from "../types.ts";

type Components = Record<string, ComponentsEntry>;
type ComponentsEntry = {
  component: Component;
  utilities?: PageUtilities;
  utilitiesPath: string;
};

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
    loadModule: (path: string) => Promise<PageUtilities>;
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
          let utilitiesPath = p.replace(extension, ".ts");

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

          try {
            await Deno.lstat(p);

            utilities = await loadModule(p.replace(extension, ".ts"));
          } catch (_) {
            // Nothing to do
          }

          return [
            componentName,
            {
              component: await getJson<Component>(p),
              utilities,
            },
          ];
        }));
      }

      return Object.fromEntries<
        { component: Component; utilities?: PageUtilities }
      >(
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
          urlJoin(componentsPath, componentName + ".ts")
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

export { type Components, initLoaders, type Loader };
