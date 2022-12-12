/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { compileScript } from "../utilities/compileScripts.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import { fs, nanoid, path } from "../server-deps.ts";
import type { BuildWorkerEvent, PluginModule, ProjectMeta } from "../types.ts";

let id: string;
let projectMeta: ProjectMeta;
let plugins: PluginModule[];

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: BuildWorkerEvent = e.data;

  if (type === "init") {
    id = nanoid();

    DEBUG && console.log("worker - starting to init", id);

    const { payload } = e.data;

    projectMeta = payload.projectMeta;

    const ret = await importPlugins(projectMeta);
    plugins = ret.plugins;

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
  if (type === "writeFiles") {
    const { payload: { inputDirectory, outputDirectory, outputPath } } = e.data;

    await fs.copy(inputDirectory, path.join(outputDirectory, outputPath), {
      overwrite: true,
    });
  }

  self.postMessage({ type: "finished" });
};

async function writeScript(
  outputPath: string,
  scriptName: string,
  scriptDirectory: string,
) {
  const script = await compileScript({
    path: scriptDirectory,
    name: scriptName,
    mode: "production",
  });
  const scriptPath = path.join(outputPath, scriptName);

  DEBUG && console.log("writing script", scriptPath);

  return Deno.writeTextFile(scriptPath, script.content);
}
