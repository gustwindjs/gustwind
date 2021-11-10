import { esbuild, fs, path } from "../deps.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { compileScripts } from "../utils/compileScripts.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import type { BuildWorkerEvent, ProjectMeta } from "../types.ts";

async function build(projectMeta: ProjectMeta, projectRoot: string) {
  const amountOfBuildThreads = getAmountOfThreads(
    projectMeta.amountOfBuildThreads,
  );
  console.log(
    `Building to static with ${amountOfBuildThreads} thread${
      amountOfBuildThreads > 1 ? "s" : ""
    }`,
  );

  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;

  const startTime = performance.now();
  const components = await getComponents("./components");
  const outputDirectory = projectPaths.output;

  await fs.ensureDir(outputDirectory).then(async () => {
    await Promise.all([
      writeScripts("./scripts", outputDirectory),
      writeScripts(projectPaths.scripts, outputDirectory),
    ]);

    const transformDirectory = path.join(outputDirectory, "transforms");
    fs.ensureDir(transformDirectory).then(async () => {
      await writeScripts(projectPaths.transforms, transformDirectory);

      esbuild.stop();
    });

    if (projectMeta.features?.showEditorAlways) {
      Deno.writeTextFile(
        path.join(outputDirectory, "components.json"),
        JSON.stringify(components),
      );
    }

    const tasks: BuildWorkerEvent[] = [];
    const { routes } = await generateRoutes({
      dataSourcesPath: projectPaths.dataSources,
      transformsPath: projectPaths.transforms,
      renderPage: ({ route, path: filePath, page, context }) =>
        tasks.push({
          type: "build",
          payload: {
            route,
            filePath,
            dir: path.join(outputDirectory, route),
            extraContext: context,
            page,
          },
        }),
      pagesPath: "./pages",
      siteName: projectMeta.siteName,
    });
    const workerPool = createWorkerPool<BuildWorkerEvent>(
      amountOfBuildThreads,
      () => {
        workerPool.terminate();

        const endTime = performance.now();
        const duration = endTime - startTime;
        const routeAmount = routes.length;

        console.log(
          `Generated ${routeAmount} pages in ${duration}ms.\nAverage: ${
            Math.round(
              duration /
                routeAmount * 1000,
            ) / 1000
          } ms per page.`,
        );
      },
    );

    workerPool.addTaskToEach({
      type: "init",
      payload: {
        components,
        projectMeta,
      },
    });

    tasks.forEach((task) => workerPool.addTaskToQueue(task));
  });
}

function getAmountOfThreads(
  amountOfThreads: ProjectMeta["amountOfBuildThreads"],
) {
  if (amountOfThreads === "cpuMax") {
    // -1 since the main thread needs one CPU but at least one
    return Math.max(navigator.hardwareConcurrency - 1, 1);
  }

  return amountOfThreads;
}

type WorkerStatus = "created" | "processing" | "waiting";
type WorkerWrapper = { status: WorkerStatus; worker: Worker };

function createWorkerPool<E>(amount: number, onWorkDone: () => void) {
  const onReady = (workerWrapper: WorkerWrapper) => {
    workerWrapper.status = "waiting";

    if (waitingTasks.length) {
      const task = waitingTasks.pop();

      workerWrapper.status = "processing";
      workerWrapper.worker.postMessage(task);
    } else if (workers.every(({ status }) => status !== "processing")) {
      onWorkDone();
    }
  };
  const waitingTasks: E[] = [];
  const workers: WorkerWrapper[] = Array.from(
    { length: amount },
    () => createWorker(onReady),
  );

  return {
    addTaskToEach: (task: E) => {
      workers.forEach(({ worker }) => worker.postMessage(task));
    },
    addTaskToQueue: (task: E) => {
      const freeWorker = workers.find(({ status }) => status !== "processing");

      if (freeWorker) {
        freeWorker.status = "processing";
        freeWorker.worker.postMessage(task);
      } else {
        waitingTasks.push(task);
      }
    },
    terminate: () => {
      workers.forEach(({ worker }) => worker.terminate());
    },
  };
}

function createWorker(onReady: (WorkerWrapper: WorkerWrapper) => void) {
  const ret: WorkerWrapper = {
    status: "created",
    worker: new Worker(
      new URL("./buildWorker.ts", import.meta.url).href,
      {
        type: "module",
        deno: {
          namespace: true,
          permissions: "inherit",
        },
      },
    ),
  };
  ret.worker.onmessage = () => onReady(ret);

  return ret;
}

async function writeScripts(scriptsPath: string, outputPath: string) {
  if (!scriptsPath) {
    return Promise.resolve();
  }

  const scriptsWithFiles = await compileScripts(scriptsPath, "production");

  return Promise.all(
    scriptsWithFiles.map(({ name, content }) =>
      content
        ? Deno.writeTextFile(
          path.join(outputPath, name.replace("ts", "js")),
          content,
        )
        : Promise.resolve()
    ),
  );
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta, Deno.cwd());
}

export { build };
