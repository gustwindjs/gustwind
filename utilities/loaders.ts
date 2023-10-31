import { path } from "../server-deps.ts";
import { getJson } from "./fs.ts";
import { htmlToBreezewind } from "../html-to-breezewind/mod.ts";
import type { Component } from "../breezewind/types.ts";
import type { PageUtilities } from "../types.ts";

type Components = Record<
  string,
  { component: Component; utilities?: PageUtilities }
>;

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
    html: async (componentsPath: string): Promise<Components> => {
      const extension = ".html";
      const components = await Promise.all((await loadDir({
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
            component: htmlToBreezewind(await Deno.readTextFile(p)),
            utilities,
          },
        ];
      }));

      return Object.fromEntries<
        { component: Component; utilities?: PageUtilities }
      >(
        // @ts-expect-error The type is wrong here. Likely htmToBreezewind needs a fix.
        components,
      );
    },
    json: async (componentsPath: string): Promise<Components> => {
      const extension = ".json";
      const components = await Promise.all((await loadDir({
        path: path.join(cwd, componentsPath),
        extension,
        recursive: true,
        type: "components",
      })).map(async (
        { path: p },
      ) => {
        const componentName = path.basename(p, path.extname(p));

        return [
          componentName,
          {
            component: getJson<Component>(await Deno.readTextFile(p)),
            utilities: loadModule(p.replace(extension, ".ts")),
          },
        ];
      }));

      return Object.fromEntries<
        { component: Component; utilities?: PageUtilities }
      >(
        // @ts-expect-error The type is wrong here
        components,
      );
    },
  };
};

export { type Components, initLoaders, type Loader };
