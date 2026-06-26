import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import getMarkedMarkdown from "../site/transforms/markdown.ts";
import getSatteriMarkdown from "../site/transforms/markdownSatteri.ts";
import type { DataSourcesApi } from "../types.ts";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownPaths = [
  "README.md",
  "DEV.md",
  "gustwind-node/README.md",
  "htmlisp/README.md",
  "documentation/concepts.md",
  "documentation/configuration.md",
  "documentation/deployment.md",
  "documentation/modes.md",
  "documentation/routing.md",
];
const iterations = Number(process.env.MARKDOWN_BENCHMARK_ITERATIONS ?? 100);

const files = await Promise.all(
  markdownPaths.map(async (filePath) => ({
    path: filePath,
    content: await readFile(path.join(rootDirectory, filePath), "utf8"),
  })),
);
const api = createBenchmarkApi();
const transforms = [
  { name: "marked", transform: getMarkedMarkdown(api) },
  { name: "satteri", transform: getSatteriMarkdown(api) },
];
const results = [];

for (const { name, transform } of transforms) {
  await runCorpus(transform);

  const start = performance.now();

  for (let iteration = 0; iteration < iterations; iteration++) {
    await runCorpus(transform);
  }

  const totalDurationMs = performance.now() - start;
  const outputs = await runCorpus(transform);

  results.push({
    name,
    files: files.length,
    iterations,
    totalDurationMs: round(totalDurationMs),
    averageCorpusDurationMs: round(totalDurationMs / iterations),
    averageFileDurationMs: round(totalDurationMs / iterations / files.length),
    contentDigest: digest(outputs.map((output) => output.content).join("\n")),
    tocEntries: outputs.reduce((sum, output) => sum + output.tableOfContents.length, 0),
  });
}

console.log(JSON.stringify({
  schemaVersion: 1,
  benchmark: "markdown-transforms",
  markdownBytes: files.reduce((sum, file) => sum + file.content.length, 0),
  results,
}, null, 2));

async function runCorpus(
  transform: ReturnType<typeof getMarkedMarkdown> | ReturnType<typeof getSatteriMarkdown>,
) {
  const results = [];

  for (const file of files) {
    results.push(await transform(file.content));
  }

  return results;
}

function createBenchmarkApi(): DataSourcesApi {
  return {
    load: {
      dir: async () => [],
      json: async () => {
        throw new Error("json should not be called");
      },
      module: async () => {
        throw new Error("module should not be called");
      },
      textFile: async (targetPath) => readFile(resolveBenchmarkPath(targetPath), "utf8"),
      textFileSync: () => "",
    },
    render: async () => "",
    renderRaw: (value) => ({ __htmlispRaw: true, value: String(value) }),
    renderSync: ({ componentName }) => `<div data-benchmark-component="${componentName}"></div>`,
  };
}

function resolveBenchmarkPath(targetPath: string) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.join(rootDirectory, targetPath);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
