/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { compileScript } from "../utils/compileScripts.ts";
import { fs, nanoid, path } from "../server-deps.ts";
import { renderPage } from "./renderPage.ts";
import type { Utilities } from "../breezewind/types.ts";
import type {
  BuildWorkerEvent,
  Components,
  DataSources,
  ProjectMeta,
} from "../types.ts";

let id: string;
let components: Components;
let dataSources: DataSources;
let projectMeta: ProjectMeta;
let pageUtilities: Utilities;
let twindSetup: Record<string, unknown>;

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: BuildWorkerEvent = e.data;

  if (type === "init") {
    id = nanoid();

    DEBUG && console.log("worker - starting to init", id);

    const { payload } = e.data;

    components = payload.components;
    projectMeta = payload.projectMeta;

    dataSources = projectMeta.paths.dataSources
      ? await import("file://" + projectMeta.paths.dataSources).then((m) => m)
      : {};

    pageUtilities = projectMeta.paths.pageUtilities
      ? await import("file://" + projectMeta.paths.pageUtilities).then((m) => m)
      : {};

    twindSetup = projectMeta.paths.twindSetup
      ? await import("file://" + projectMeta.paths.twindSetup).then((m) =>
        m.default
      )
      : {};

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const {
      payload: {
        layout,
        route,
        filePath,
        dir,
        url,
      },
    } = e.data;

    DEBUG && console.log("worker - starting to build", id, route, filePath);

    const [html, context, css] = await renderPage({
      projectMeta,
      layout,
      route,
      mode: "production",
      pagePath: "", // TODO
      twindSetup,
      components,
      pageUtilities,
      pathname: url,
      dataSources,
    });

    if (css) {
      // TODO: Push this to a task
      await Deno.writeTextFile(path.join(dir, "styles.css"), css);
    }

    if (route.type !== "xml" && projectMeta.features?.showEditorAlways) {
      // TODO: Can these be pushed to tasks?
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "context.json"),
        JSON.stringify(context),
      );
      await Deno.writeTextFile(
        path.join(dir, "layout.json"),
        JSON.stringify(layout),
      );
      await Deno.writeTextFile(
        path.join(dir, "route.json"),
        JSON.stringify(route),
      );
    }

    if (route.type === "xml") {
      await Deno.writeTextFile(dir, html);
    } else {
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        html,
      );
    }

    DEBUG && console.log("worker - finished build", id, route, filePath);
  }
  if (type === "writeScript") {
    const {
      payload: {
        outputDirectory,
        scriptName,
        scriptPath,
      },
    } = e.data;

    await writeScript(outputDirectory, scriptName, scriptPath);
  }
  if (type === "writeFile") {
    const {
      payload: {
        dir,
        file,
        data,
      },
    } = e.data;

    await fs.ensureDir(dir);
    await Deno.writeTextFile(path.join(dir, file), data);
  }
  if (type === "writeAssets") {
    const {
      payload: {
        outputPath,
        assetsPath,
      },
    } = e.data;

    await fs.copy(assetsPath, outputPath, { overwrite: true });
  }

  self.postMessage({});
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
