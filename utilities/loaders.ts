import { path } from "../server-deps.ts";
import { getDefinitions } from "../gustwind-utilities/getDefinitions.ts";
import { htmlToBreezewind } from "../html-to-breezewind/mod.ts";
import type { Component } from "../breezewind/types.ts";

type Loader = "html" | "json";

const initLoaders = (
  { cwd, loadDir }: {
    cwd: string;
    loadDir: (
      { path, extension, recursive, type }: {
        path: string;
        extension: string;
        recursive: boolean;
        type: string;
      },
    ) => Promise<{ name: string; path: string }[]>;
  },
) => {
  return {
    html: async (componentsPath: string) => {
      const components = await Promise.all((await loadDir({
        path: path.join(cwd, componentsPath),
        extension: ".html",
        recursive: true,
        type: "components",
      })).map(async (
        { path: p },
      ) => [
        path.basename(p, path.extname(p)),
        htmlToBreezewind(await Deno.readTextFile(p)),
      ]));

      return Object.fromEntries<Component>(
        // @ts-expect-error The type is wrong here. Likely htmToBreezewind needs a fix.
        components,
      );
    },
    json: async (componentsPath: string) => {
      return getDefinitions<Component>(
        await loadDir({
          path: path.join(cwd, componentsPath),
          extension: ".json",
          recursive: true,
          type: "components",
        }),
      );
    },
  };
};

export { initLoaders, type Loader };
