import * as path from "node:path";
import * as pagefind from "pagefind";
import type { Mode, Plugin, Tasks } from "../../types.ts";

const optionalUiFiles = new Set([
  "pagefind-highlight.js",
  "pagefind-modular-ui.css",
  "pagefind-modular-ui.js",
  "pagefind-ui.css",
  "pagefind-ui.js",
]);

type PagefindPluginOptions = {
  indexInDev: boolean;
  writeUiAssets?: boolean;
};

const plugin: Plugin<PagefindPluginOptions> = {
  meta: {
    name: "gustwind-pagefind-plugin",
    description:
      "${name} implements side-wide search using PageFind underneath. Make sure to integrate the results with the <PageFind> component.",
  },
  async init(
    { cwd, options: { indexInDev, writeUiAssets = true }, outputDirectory, mode },
  ) {
    const developmentFiles = await getDevelopmentIndexFiles({
      cwd,
      indexInDev,
      mode,
      outputDirectory,
    });

    return {
      sendMessages: ({ send }) => {
        getEmittedFiles(developmentFiles, writeUiAssets).forEach(({ path: file }) =>
          // TODO: Scope this to router plugins using prefixing (router-)
          // This needs a change at plugins.ts logic
          send("*", {
            type: "addDynamicRoute",
            payload: { path: "pagefind/" + file },
          })
        );
      },
      // This triggers only in production and then a full index is needed no matter what
      finishBuild: async () => {
        return await createPagefindWriteTasks({
          cwd,
          outputDirectory,
          writeUiAssets,
        });
      },
    };
  },
};

async function getDevelopmentIndexFiles(
  {
    cwd,
    indexInDev,
    mode,
    outputDirectory,
  }: {
    cwd: string;
    indexInDev: boolean;
    mode: Mode;
    outputDirectory: string;
  },
) {
  // It is enough to generate an index once in development mode since it
  // doesn't have to be completely accurate.
  if (mode !== "development") {
    return [];
  }

  return indexInDev
    ? await indexPagefindDirectory(cwd, outputDirectory)
    : await indexEmptyPagefind();
}

async function createPagefindWriteTasks(
  {
    cwd,
    outputDirectory,
    writeUiAssets,
  }: {
    cwd: string;
    outputDirectory: string;
    writeUiAssets: boolean;
  },
): Promise<Tasks> {
  const files = await indexPagefindDirectory(cwd, outputDirectory);

  return getEmittedFiles(files, writeUiAssets).map(
    ({ path: file, content: data }) => ({
      type: "writeFile",
      payload: {
        outputDirectory,
        file: path.join("pagefind", file),
        data,
      },
    }),
  );
}

async function indexEmptyPagefind() {
  const index = await createPagefindIndex();
  const { files } = await index.getFiles();

  return files;
}

async function indexPagefindDirectory(cwd: string, outputDirectory: string) {
  const index = await createPagefindIndex();

  await index.addDirectory({
    path: path.join(cwd, outputDirectory),
  });

  const { files } = await index.getFiles();

  return files;
}

async function createPagefindIndex() {
  const { index } = await pagefind.createIndex({});

  if (!index) {
    throw new Error("pagefind failed to create an index");
  }

  return index;
}

function getEmittedFiles(
  indexFiles: pagefind.IndexFile[],
  writeUiAssets: boolean,
) {
  return writeUiAssets
    ? indexFiles
    : indexFiles.filter(({ path: filePath }) => !optionalUiFiles.has(filePath));
}

export { plugin };
