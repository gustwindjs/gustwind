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
type ComponentLoaderOptions = {
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
};

const initLoader = (
  options: ComponentLoaderOptions,
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
    const components = await loadComponents({
      componentsPath,
      extension,
      options,
      selection,
    });

    return createLoadedComponents(components);
  };
};

async function loadComponents(
  {
    componentsPath,
    extension,
    options,
    selection,
  }: {
    componentsPath: string;
    extension: string;
    options: ComponentLoaderOptions;
    selection?: string[];
  },
): Promise<ParsedComponents> {
  if (componentsPath.startsWith("http")) {
    if (!selection) {
      throw new Error("Remote loader is missing a selection");
    }

    return await loadRemoteComponents(componentsPath, selection, extension);
  }

  return await loadLocalComponents({ componentsPath, extension, options });
}

async function loadLocalComponents(
  {
    componentsPath,
    extension,
    options,
  }: {
    componentsPath: string;
    extension: string;
    options: ComponentLoaderOptions;
  },
): Promise<ParsedComponents> {
  const { cwd, loadDir } = options;
  const componentFiles = await loadDir({
    path: path.join(cwd, componentsPath),
    extension,
    recursive: true,
    type: "components",
  });

  return await Promise.all(
    componentFiles.map(({ path: filePath }) =>
      loadLocalComponent({ extension, filePath, options })
    ),
  );
}

async function loadLocalComponent(
  {
    extension,
    filePath,
    options,
  }: {
    extension: string;
    filePath: string;
    options: ComponentLoaderOptions;
  },
): Promise<ParsedComponents[number]> {
  const { loadModule, readTextFile } = options;
  const componentName = path.basename(filePath, path.extname(filePath));
  const utilitiesPath = filePath.replace(extension, ".server.ts");
  const utilities = await loadOptionalUtilities(loadModule, utilitiesPath);

  return [
    componentName,
    {
      component: await readTextFile(filePath),
      sourcePath: filePath,
      utilities,
      utilitiesPath: utilities ? utilitiesPath : undefined,
    },
  ];
}

async function loadOptionalUtilities(
  loadModule: ComponentLoaderOptions["loadModule"],
  utilitiesPath: string,
) {
  try {
    return await loadModule(utilitiesPath);
  } catch (_err) {
    return;
  }
}

function createLoadedComponents(components: ParsedComponents) {
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
}

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
