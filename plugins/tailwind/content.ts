import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { glob } from "tinyglobby";
import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import type { Mode } from "../../types.ts";

async function createTailwindCacheKey({
  cssPath,
  cwd,
  mode,
  setupPath,
}: {
  cssPath: string;
  cwd: string;
  mode: Mode;
  setupPath: string;
}) {
  const [dependencyFingerprint, contentFingerprint] = await Promise.all([
    hashDependencyTasks(cwd, [
      {
        type: "readTextFile",
        payload: {
          path: cssPath,
          type: "styles",
        },
      },
      {
        type: "loadModule",
        payload: {
          path: setupPath,
          type: "styleSetup",
        },
      },
    ]),
    hashTailwindContent(cwd, setupPath),
  ]);

  return dependencyFingerprint && contentFingerprint !== null
    ? createHash("sha256")
        .update(
          JSON.stringify({
            contentFingerprint,
            dependencyFingerprint,
            mode,
            version: 3,
          }),
        )
        .digest("hex")
    : null;
}

async function hashTailwindContent(cwd: string, setupPath: string) {
  const contentConfig = await getTailwindContentConfig(cwd, setupPath);

  if (!contentConfig) {
    return null;
  }

  const { baseDirectory, patterns } = contentConfig;
  const hash = createHash("sha256");

  updateTailwindContentConfigHash(hash, cwd, baseDirectory, patterns);

  if (patterns.length === 0) {
    return hash.digest("hex");
  }

  const contentFiles = await findTailwindContentFiles(patterns, baseDirectory);

  if (!contentFiles) {
    return null;
  }

  await updateTailwindContentFilesHash(hash, cwd, contentFiles);

  return hash.digest("hex");
}

function updateTailwindContentConfigHash(
  hash: ReturnType<typeof createHash>,
  cwd: string,
  baseDirectory: string,
  patterns: string[],
) {
  hash.update(path.relative(cwd, baseDirectory));
  hash.update("\n");
  hash.update(JSON.stringify(patterns));
  hash.update("\n");
}

async function findTailwindContentFiles(
  patterns: string[],
  baseDirectory: string,
) {
  try {
    return await glob(patterns, {
      absolute: true,
      cwd: baseDirectory,
      dot: true,
      ignore: ["**/node_modules/**", ".gustwind/**"],
      onlyFiles: true,
    });
  } catch {
    return null;
  }
}

async function updateTailwindContentFilesHash(
  hash: ReturnType<typeof createHash>,
  cwd: string,
  contentFiles: string[],
) {
  for (const filePath of [...new Set(contentFiles)].sort()) {
    hash.update(path.relative(cwd, filePath));
    hash.update("\n");
    hash.update(await readFile(filePath));
    hash.update("\n");
  }
}

async function getTailwindContentConfig(cwd: string, setupPath: string) {
  const setupModule = (await import(
    `${pathToFileURL(setupPath).href}?cache=${Date.now()}`
  )) as {
    default?: {
      content?: unknown;
    };
  };

  return extractTailwindContentConfig(
    setupModule.default?.content,
    cwd,
    setupPath,
  );
}

function extractTailwindContentConfig(
  content: unknown,
  cwd: string,
  setupPath: string,
): {
  baseDirectory: string;
  patterns: string[];
} | null {
  return tailwindContentConfigResolvers
    .find(({ matches }) => matches(content))
    ?.resolve(content, cwd, setupPath) ?? null;
}

const tailwindContentConfigResolvers = [
  {
    matches: (content: unknown) => content === undefined,
    resolve: (_content: unknown, cwd: string) => ({
      baseDirectory: cwd,
      patterns: [],
    }),
  },
  {
    matches: isTailwindContentString,
    resolve: (content: unknown, cwd: string) => ({
      baseDirectory: cwd,
      patterns: [content as string],
    }),
  },
  {
    matches: isTailwindContentArray,
    resolve: (content: unknown, cwd: string) =>
      createTailwindContentConfig(
        cwd,
        extractTailwindContentFiles(content as unknown[]),
      ),
  },
  {
    matches: isTailwindContentObject,
    resolve: (content: unknown, cwd: string, setupPath: string) =>
      extractTailwindContentObjectConfig(content as object, cwd, setupPath),
  },
] satisfies {
  matches: (content: unknown) => boolean;
  resolve: (
    content: unknown,
    cwd: string,
    setupPath: string,
  ) => { baseDirectory: string; patterns: string[] } | null;
}[];

function isTailwindContentString(content: unknown): content is string {
  return typeof content === "string";
}

function isTailwindContentArray(content: unknown): content is unknown[] {
  return Array.isArray(content);
}

function isTailwindContentObject(content: unknown): content is object {
  return Boolean(content && typeof content === "object");
}

function extractTailwindContentObjectConfig(
  content: object,
  cwd: string,
  setupPath: string,
) {
  if (!("files" in content)) {
    return { baseDirectory: cwd, patterns: [] };
  }

  const contentObject = content as { files?: unknown; relative?: unknown };
  const baseDirectory =
    contentObject.relative === true ? path.dirname(setupPath) : cwd;

  return createTailwindContentConfig(
    baseDirectory,
    extractTailwindContentPatterns(contentObject.files),
  );
}

function extractTailwindContentPatterns(files: unknown) {
  if (typeof files === "string") {
    return [files];
  }

  if (Array.isArray(files)) {
    return extractTailwindContentFiles(files);
  }

  return null;
}

function createTailwindContentConfig(
  baseDirectory: string,
  patterns: string[] | null,
) {
  return patterns ? { baseDirectory, patterns } : null;
}

function extractTailwindContentFiles(files: unknown[]) {
  const patterns: string[] = [];

  for (const file of files) {
    if (typeof file === "string") {
      patterns.push(file);
      continue;
    }

    if (!isRawTailwindContent(file)) {
      return null;
    }
  }

  return patterns;
}

function isRawTailwindContent(file: unknown) {
  return Boolean(
    file &&
      typeof file === "object" &&
      typeof (file as { raw?: unknown }).raw === "string",
  );
}

export { createTailwindCacheKey };
