import * as path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Tasks } from "../types.ts";
import type { createBuildBenchmark } from "../utilities/buildBenchmark.ts";
import { stripVoidElementClosers } from "../utilities/stripVoidElementClosers.ts";
import { toRelativeOutputPath } from "../utilities/incrementalBuildCache.ts";
import { executeTask } from "./buildTasks.ts";

async function runTaskQueue({
  benchmark,
  outputDirectory,
  tasks,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  outputDirectory: string;
  tasks: Tasks;
}): Promise<void> {
  for (const task of tasks) {
    if (task.type === "build") {
      throw new Error("runTaskQueue does not support build tasks");
    }

    await executeTask({ benchmark, outputDirectory, task });
  }
}

async function writeRenderedPage({
  dir,
  markup,
  outputDirectory,
  url,
}: {
  dir: string;
  markup: string;
  outputDirectory: string;
  url: string;
}) {
  if (shouldWriteDirectOutput(url)) {
    return writeDirectRenderedOutput({ dir, markup, outputDirectory, url });
  }

  await mkdir(dir, { recursive: true });
  const outputPath = path.join(dir, "index.html");
  const output = stripVoidElementClosers(markup);
  await writeFile(outputPath, output);

  return {
    bytesWritten: Buffer.byteLength(output),
    outputPath: toRelativeOutputPath(outputDirectory, outputPath),
  };
}

function shouldWriteDirectOutput(url: string) {
  return (
    url.endsWith(".json/") || url.endsWith(".xml/") || url.endsWith(".html/")
  );
}

async function writeDirectRenderedOutput({
  dir,
  markup,
  outputDirectory,
  url,
}: {
  dir: string;
  markup: string;
  outputDirectory: string;
  url: string;
}) {
  const output = shouldPreserveRenderedOutput(url)
    ? markup
    : stripVoidElementClosers(markup);
  await mkdir(path.dirname(dir), { recursive: true });
  await writeFile(dir, output);

  return {
    bytesWritten: Buffer.byteLength(output),
    outputPath: toRelativeOutputPath(outputDirectory, dir),
  };
}

function shouldPreserveRenderedOutput(url: string) {
  return url.endsWith(".xml/") || url.endsWith(".json/");
}

export { runTaskQueue, writeRenderedPage };
