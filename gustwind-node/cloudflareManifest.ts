import { access, readdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

type CloudflareManifestComponentPath = {
  path: string;
  selection?: string[];
};

type CloudflareManifestOptions = {
  components: CloudflareManifestComponentPath[];
  globalUtilitiesPath?: string;
  outputPath?: string;
};

async function generateCloudflareManifest(
  {
    cwd,
    options,
  }: {
    cwd: string;
    options: CloudflareManifestOptions;
  },
) {
  const source = await createCloudflareManifestSource({ cwd, options });

  if (options.outputPath) {
    await writeFile(path.resolve(cwd, options.outputPath), source);
  }

  return source;
}

async function createCloudflareManifestSource(
  {
    cwd,
    options,
  }: {
    cwd: string;
    options: CloudflareManifestOptions;
  },
) {
  const componentEntries = (
    await Promise.all(
      options.components.map((componentPath) =>
        collectComponentImports(cwd, componentPath)
      ),
    )
  ).flat();
  const imports: string[] = [];
  const componentPairs: string[] = [];
  const utilityPairs: string[] = [];

  if (options.globalUtilitiesPath) {
    imports.push(
      `import * as globalUtilities from "${
        normalizeImportPath(options.globalUtilitiesPath)
      }";`,
    );
  }

  componentEntries.forEach((entry, index) => {
    const componentIdentifier = `component${index}`;

    imports.push(
      `import ${componentIdentifier} from "${normalizeImportPath(entry.htmlPath)}";`,
    );
    componentPairs.push(`${JSON.stringify(entry.name)}: ${componentIdentifier}`);

    if (entry.utilitiesPath) {
      const utilitiesIdentifier = `componentUtilities${index}`;

      imports.push(
        `import * as ${utilitiesIdentifier} from "${
          normalizeImportPath(entry.utilitiesPath)
        }";`,
      );
      utilityPairs.push(`${JSON.stringify(entry.name)}: ${utilitiesIdentifier}`);
    }
  });

  return [
    ...imports,
    "",
    `const components = { ${componentPairs.join(", ")} };`,
    `const componentUtilities = { ${utilityPairs.join(", ")} };`,
    options.globalUtilitiesPath
      ? "export { components, componentUtilities, globalUtilities };"
      : "export { components, componentUtilities };",
    "",
  ].join("\n");
}

async function collectComponentImports(
  cwd: string,
  { path: componentDirectory, selection }: CloudflareManifestComponentPath,
) {
  if (componentDirectory.startsWith("http")) {
    throw new Error("Cloudflare manifest generation does not support remote components");
  }

  const root = path.resolve(cwd, componentDirectory);
  const entries = await collectHtmlFiles(root);
  const selected = selection ? new Set(selection) : undefined;

  return (
    await Promise.all(
      entries.map(async (htmlPath) => {
        const name = path.basename(htmlPath, ".html");

        if (selected && !selected.has(name)) {
          return;
        }

        const utilitiesPath = await getExistingPath(
          htmlPath.replace(/\.html$/, ".server.ts"),
        );

        return {
          htmlPath: toRelativeImportPath(cwd, htmlPath),
          name,
          utilitiesPath: utilitiesPath
            ? toRelativeImportPath(cwd, utilitiesPath)
            : undefined,
        };
      }),
    )
  ).filter((entry) => entry !== undefined);
}

async function collectHtmlFiles(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    files.push(...await collectHtmlEntry(directoryPath, entry));
  }

  return files.sort();
}

async function collectHtmlEntry(
  directoryPath: string,
  entry: { name: string; isFile(): boolean; isDirectory(): boolean },
): Promise<string[]> {
  const entryPath = path.join(directoryPath, entry.name);

  if (entry.isDirectory()) {
    return collectHtmlFiles(entryPath);
  }

  return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
}

async function getExistingPath(filePath: string) {
  try {
    await access(filePath);
    return filePath;
  } catch {
    return;
  }
}

function toRelativeImportPath(cwd: string, filePath: string) {
  return normalizeImportPath(path.relative(cwd, filePath));
}

function normalizeImportPath(filePath: string) {
  const normalized = filePath.replaceAll(path.sep, "/");

  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

export { createCloudflareManifestSource, generateCloudflareManifest };
export type { CloudflareManifestOptions };
