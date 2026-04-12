import { performance } from "node:perf_hooks";

type BuildRouteBenchmark = {
  bytesWritten: number;
  durationMs: number;
  memoryRssBytes: number;
  outputPath: string;
  url: string;
};

type BuildBenchmark = {
  averageRouteDurationMs: number;
  fastestRoute: BuildRouteBenchmark | null;
  finalMemoryRssBytes: number;
  finishedAt: string;
  outputDirectory: string;
  p50RouteDurationMs: number;
  p95RouteDurationMs: number;
  peakMemoryRssBytes: number;
  routeResults: BuildRouteBenchmark[];
  routesBuilt: number;
  schemaVersion: 1;
  slowestRoute: BuildRouteBenchmark | null;
  startedAt: string;
  tasksProcessed: number;
  totalDurationMs: number;
};

function createBuildBenchmark(outputDirectory: string) {
  const routeResults: BuildRouteBenchmark[] = [];
  const startMemory = process.memoryUsage().rss;
  let peakMemoryRssBytes = startMemory;
  const startedAt = new Date();
  const startTime = performance.now();
  let tasksProcessed = 0;

  return {
    markTaskProcessed() {
      tasksProcessed++;
      peakMemoryRssBytes = Math.max(peakMemoryRssBytes, process.memoryUsage().rss);
    },
    recordRoute(result: BuildRouteBenchmark) {
      routeResults.push(result);
      peakMemoryRssBytes = Math.max(
        peakMemoryRssBytes,
        result.memoryRssBytes,
        process.memoryUsage().rss,
      );
    },
    finish(): BuildBenchmark {
      const durations = routeResults.map(({ durationMs }) => durationMs).sort((a, b) => a - b);
      const finalMemoryRssBytes = process.memoryUsage().rss;
      const slowestRoute = routeResults.reduce<BuildRouteBenchmark | null>(
        (slowest, routeResult) =>
          !slowest || routeResult.durationMs > slowest.durationMs ? routeResult : slowest,
        null,
      );
      const fastestRoute = routeResults.reduce<BuildRouteBenchmark | null>(
        (fastest, routeResult) =>
          !fastest || routeResult.durationMs < fastest.durationMs ? routeResult : fastest,
        null,
      );

      peakMemoryRssBytes = Math.max(peakMemoryRssBytes, finalMemoryRssBytes);

      return {
        averageRouteDurationMs: roundMetric(average(durations)),
        fastestRoute,
        finalMemoryRssBytes,
        finishedAt: new Date().toISOString(),
        outputDirectory,
        p50RouteDurationMs: roundMetric(percentile(durations, 0.5)),
        p95RouteDurationMs: roundMetric(percentile(durations, 0.95)),
        peakMemoryRssBytes,
        routeResults: routeResults.map((routeResult) => ({
          ...routeResult,
          durationMs: roundMetric(routeResult.durationMs),
        })),
        routesBuilt: routeResults.length,
        schemaVersion: 1,
        slowestRoute,
        startedAt: startedAt.toISOString(),
        tasksProcessed,
        totalDurationMs: roundMetric(performance.now() - startTime),
      };
    },
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], ratio: number) {
  if (!values.length) {
    return 0;
  }

  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  const index = Math.min(
    values.length - 1,
    Math.max(0, Math.ceil(values.length * clampedRatio) - 1),
  );

  return values[index];
}

function roundMetric(value: number) {
  return Math.round(value * 1000) / 1000;
}

export { createBuildBenchmark };
export type { BuildBenchmark, BuildRouteBenchmark };
