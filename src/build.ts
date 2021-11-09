import { esbuild, fs, path } from "../deps.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { compileScripts } from "../utils/compileScripts.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import type { ProjectMeta } from "../types.ts";

async function build(projectMeta: ProjectMeta, projectRoot: string) {
  console.log("Building to static");

  const projectPaths = resolvePaths(projectRoot, projectMeta.paths);
  let routes: string[] = [];

  const startTime = performance.now();
  const components = await getComponents("./components");
  const outputDirectory = projectPaths.output;

  // TODO: Don't generate more workers than there are pages to generate
  // TODO: Maybe there's a good heuristic here re: page and worker amount
  // amount of threads - navigator.hardwareConcurrency - 1
  const workerPool = createWorkerPool(1, () => {
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
  });

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

    Deno.writeTextFile(
      path.join(outputDirectory, "components.json"),
      JSON.stringify(components),
    );

    const ret = await generateRoutes({
      transformsPath: projectPaths.transforms,
      renderPage: (route, filePath, page, extraContext) =>
        // TODO: Separate tasks from a pool
        workerPool.addTask({
          projectPaths,
          route,
          filePath,
          dir: path.join(outputDirectory, route),
          extraContext,
          components: components,
          projectMeta,
          page,
        }),
      pagesPath: "./pages",
      siteName: projectMeta.siteName,
    });

    routes = ret.routes;
  });
}

type Task = Record<string, unknown>;
type WorkerStatus = "created" | "processing" | "waiting";
type WorkerWrapper = { status: WorkerStatus; worker: Worker };

function createWorkerPool(amount: number, onWorkDone: () => void) {
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
  const waitingTasks: Task[] = [];
  const workers: WorkerWrapper[] = Array.from(
    { length: amount },
    () => createWorker(onReady),
  );

  return {
    addTask: (task: Task) => {
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
