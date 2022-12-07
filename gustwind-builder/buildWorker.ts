/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { compileScript } from "../utilities/compileScripts.ts";
import {
  applyPlugins,
  importPlugin,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import { fs, nanoid, path } from "../server-deps.ts";
import type {
  BuildWorkerEvent,
  Plugin,
  ProjectMeta,
  Renderer,
} from "../types.ts";

let id: string;
let projectMeta: ProjectMeta;
let render: Renderer["render"];
let plugins: Plugin[];

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: BuildWorkerEvent = e.data;

  if (type === "init") {
    id = nanoid();

    DEBUG && console.log("worker - starting to init", id);

    const { payload } = e.data;

    projectMeta = payload.projectMeta;

    const plugin = await importPlugin<Renderer>(
      projectMeta.renderer,
      projectMeta,
    );
    render = plugin.render;

    plugins = await importPlugins(projectMeta);

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const {
      payload: {
        route,
        filePath,
        dir,
        url,
      },
    } = e.data;

    DEBUG && console.log("worker - starting to build", id, route, filePath);

    const { markup, tasks } = await applyPlugins({
      plugins,
      mode: "production",
      url,
      projectMeta,
      route,
      render,
    });

    self.postMessage({
      type: "addTasks",
      payload: tasks,
    });

    if (route.type === "xml") {
      await Deno.writeTextFile(dir, markup);
    } else {
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        markup,
      );
    }

    DEBUG && console.log("worker - finished build", id, route, filePath);
  }
  if (type === "writeScript") {
    const { payload: { outputDirectory, scriptName, scriptPath } } = e.data;

    await fs.ensureDir(outputDirectory);
    await writeScript(outputDirectory, scriptName, scriptPath);
  }
  if (type === "writeFile") {
    const { payload: { outputDirectory, file, data } } = e.data;

    await fs.ensureDir(outputDirectory);
    await Deno.writeTextFile(path.join(outputDirectory, file), data);
  }
  if (type === "writeAssets") {
    const { payload: { outputPath, assetsPath } } = e.data;

    await fs.copy(assetsPath, outputPath, { overwrite: true });
  }

  self.postMessage({ type: "finished" });
};

async function writeScript(
  outputPath: string,
  scriptName: string,
  scriptDirectory?: string,
) {
  if (!scriptDirectory) {
    return Promise.resolve();
  }

  const script = await compileScript({
    path: scriptDirectory,
    name: scriptName,
    mode: "production",
  });
  const scriptPath = path.join(outputPath, scriptName.replace(".ts", ".js"));

  DEBUG && console.log("writing script", scriptPath);

  return Deno.writeTextFile(scriptPath, script.content);
}
