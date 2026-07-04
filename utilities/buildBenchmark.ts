import { performance } from "node:perf_hooks";

type BuildRouteBenchmark = {
  bytesWritten: number;
  durationMs: number;
  memoryRssBytes: number;
  outputPath: string;
  url: string;
};
type BuildPhaseBenchmark = {
  durationMs: number;
  name: string;
};
type BuildPhaseSummary = BuildPhaseBenchmark & {
  count: number;
};
type BuildDataSourceBenchmark = {
  cacheHit: boolean;
  durationMs: number;
  name: string;
  operation: string;
  parameters: unknown[];
};
type BuildDataSourceSummary = {
  cacheHits: number;
  cacheMisses: number;
  count: number;
  durationMs: number;
  operation: string;
};
type BuildComponentBenchmark = {
  componentName: string;
  durationMs: number;
  url?: string;
};
type BuildComponentSummary = {
  componentName: string;
  count: number;
  durationMs: number;
};

type BuildBenchmark = {
  averageRouteDurationMs: number;
  componentResults: BuildComponentBenchmark[];
  componentSummary: BuildComponentSummary[];
  dataSourceResults: BuildDataSourceBenchmark[];
  dataSourceSummary: BuildDataSourceSummary[];
  fastestRoute: BuildRouteBenchmark | null;
  finalMemoryRssBytes: number;
  finishedAt: string;
  outputDirectory: string;
  p50RouteDurationMs: number;
  p95RouteDurationMs: number;
  phaseResults: BuildPhaseBenchmark[];
  phaseSummary: BuildPhaseSummary[];
  peakMemoryRssBytes: number;
  routeResults: BuildRouteBenchmark[];
  routesBuilt: number;
  schemaVersion: 1;
  slowestRoute: BuildRouteBenchmark | null;
  startedAt: string;
  tasksProcessed: number;
  totalDurationMs: number;
};

type RouteDiagnostics = {
  lines: string[];
  topRoutes: BuildRouteBenchmark[];
};

function createBuildBenchmark(outputDirectory: string) {
  const routeResults: BuildRouteBenchmark[] = [];
  const phaseResults: BuildPhaseBenchmark[] = [];
  const dataSourceResults: BuildDataSourceBenchmark[] = [];
  const componentResults: BuildComponentBenchmark[] = [];
  const startMemory = process.memoryUsage().rss;
  let peakMemoryRssBytes = startMemory;
  const startedAt = new Date();
  const startTime = performance.now();
  let tasksProcessed = 0;

  return {
    async timePhase<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const phaseStart = performance.now();

      try {
        return await fn();
      } finally {
        this.recordPhase(name, performance.now() - phaseStart);
      }
    },
    markTaskProcessed() {
      tasksProcessed++;
      peakMemoryRssBytes = Math.max(peakMemoryRssBytes, process.memoryUsage().rss);
    },
    recordDataSourceCall(result: BuildDataSourceBenchmark) {
      dataSourceResults.push(result);
      peakMemoryRssBytes = Math.max(peakMemoryRssBytes, process.memoryUsage().rss);
    },
    recordComponentRender(result: BuildComponentBenchmark) {
      componentResults.push(result);
      peakMemoryRssBytes = Math.max(peakMemoryRssBytes, process.memoryUsage().rss);
    },
    recordPhase(name: string, durationMs: number) {
      phaseResults.push({ durationMs, name });
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
        componentResults: componentResults.map((result) => ({
          ...result,
          durationMs: roundMetric(result.durationMs),
        })),
        componentSummary: summarizeComponents(componentResults),
        dataSourceResults: dataSourceResults.map((result) => ({
          ...result,
          durationMs: roundMetric(result.durationMs),
        })),
        dataSourceSummary: summarizeDataSources(dataSourceResults),
        fastestRoute,
        finalMemoryRssBytes,
        finishedAt: new Date().toISOString(),
        outputDirectory,
        p50RouteDurationMs: roundMetric(percentile(durations, 0.5)),
        p95RouteDurationMs: roundMetric(percentile(durations, 0.95)),
        phaseResults: phaseResults.map((result) => ({
          ...result,
          durationMs: roundMetric(result.durationMs),
        })),
        phaseSummary: summarizePhases(phaseResults),
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

function summarizeComponents(
  results: BuildComponentBenchmark[],
): BuildComponentSummary[] {
  return Object.entries(groupBy(results, ({ componentName }) => componentName))
    .map(([componentName, componentResults]) => ({
      componentName,
      count: componentResults.length,
      durationMs: roundMetric(sum(componentResults.map(({ durationMs }) => durationMs))),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

function summarizePhases(results: BuildPhaseBenchmark[]): BuildPhaseSummary[] {
  return Object.entries(groupBy(results, ({ name }) => name))
    .map(([name, phaseResults]) => ({
      count: phaseResults.length,
      durationMs: roundMetric(sum(phaseResults.map(({ durationMs }) => durationMs))),
      name,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

function summarizeDataSources(
  results: BuildDataSourceBenchmark[],
): BuildDataSourceSummary[] {
  return Object.entries(groupBy(results, ({ operation }) => operation))
    .map(([operation, dataSourceResults]) => ({
      cacheHits: dataSourceResults.filter(({ cacheHit }) => cacheHit).length,
      cacheMisses: dataSourceResults.filter(({ cacheHit }) => !cacheHit).length,
      count: dataSourceResults.length,
      durationMs: roundMetric(sum(dataSourceResults.map(({ durationMs }) => durationMs))),
      operation,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string,
): Record<string, T[]> {
  return values.reduce<Record<string, T[]>>((groups, value) => {
    const key = getKey(value);

    groups[key] = groups[key] || [];
    groups[key].push(value);

    return groups;
  }, {});
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
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

function formatRouteDiagnostics(
  benchmark: BuildBenchmark,
  topCount = 5,
): RouteDiagnostics {
  const topRoutes = [...benchmark.routeResults]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, Math.max(1, topCount));

  return {
    topRoutes,
    lines: [
      `Top ${topRoutes.length} slow routes by wall-clock render time:`,
      ...topRoutes.map((routeResult, index) =>
        `${index + 1}. ${routeResult.url} ${roundMetric(routeResult.durationMs)} ms | ${
          formatBytes(routeResult.bytesWritten)
        } | ${routeResult.outputPath}`
      ),
      `Average ${benchmark.averageRouteDurationMs} ms | p50 ${benchmark.p50RouteDurationMs} ms | p95 ${benchmark.p95RouteDurationMs} ms`,
      "Build phase totals:",
      ...benchmark.phaseSummary.map((phase) =>
        `- ${phase.name}: ${phase.durationMs} ms across ${phase.count} run${phase.count === 1 ? "" : "s"}`
      ),
      ...formatDataSourceSummary(benchmark),
      ...formatComponentSummary(benchmark),
      "Note: route timings can overlap because production builds render routes concurrently.",
    ],
  };
}

function formatComponentSummary(benchmark: BuildBenchmark) {
  if (!benchmark.componentSummary.length) {
    return [];
  }

  return [
    "Component render totals:",
    ...benchmark.componentSummary.slice(0, 10).map((component) =>
      `- ${component.componentName}: ${component.durationMs} ms across ${component.count} render${component.count === 1 ? "" : "s"}`
    ),
  ];
}

function formatDataSourceSummary(benchmark: BuildBenchmark) {
  if (!benchmark.dataSourceSummary.length) {
    return [];
  }

  return [
    "Data source totals:",
    ...benchmark.dataSourceSummary.map((source) =>
      `- ${source.operation}: ${source.durationMs} ms across ${source.count} call${source.count === 1 ? "" : "s"} (${source.cacheHits} cache hit${source.cacheHits === 1 ? "" : "s"})`
    ),
  ];
}

function formatBytes(byteCount: number) {
  if (byteCount < 1024) {
    return `${byteCount} B`;
  }

  return `${roundMetric(byteCount / 1024)} kB`;
}

export { createBuildBenchmark };
export { formatRouteDiagnostics };
export type {
  BuildBenchmark,
  BuildComponentBenchmark,
  BuildDataSourceBenchmark,
  BuildPhaseBenchmark,
  BuildRouteBenchmark,
  RouteDiagnostics,
};
