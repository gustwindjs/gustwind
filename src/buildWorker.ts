/// <reference lib="webworker" />
import { nanoid } from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import { compileScript } from "../utils/compileScripts.ts";
import { fs, path } from "../deps.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import type { BuildWorkerEvent, ProjectMeta } from "../types.ts";

let id: string;
let renderPage: ReturnType<typeof getPageRenderer>;
let projectMeta: ProjectMeta;

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: BuildWorkerEvent = e.data;

  if (type === "init") {
    id = nanoid();

    DEBUG && console.log("worker - starting to init", id);

    const {
      payload: {
        components,
        projectMeta: meta,
      },
    } = e.data;

    projectMeta = meta;

    const twindSetup = meta.paths.twindSetup
      ? await import("file://" + meta.paths.twindSetup).then((m) => m.default)
      : {};

    DEBUG && console.log("worker - twind setup", twindSetup);

    renderPage = getPageRenderer({
      components,
      mode: "production",
      twindSetup,
    });

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const {
      payload: {
        route,
        filePath,
        dir,
        extraContext,
        page,
      },
    } = e.data;

    DEBUG && console.log("worker - starting to build", id, route, filePath);

    const [html, js, context] = await renderPage({
      pathname: route,
      pagePath: filePath,
      page,
      extraContext,
      projectMeta,
    });

    await fs.ensureDir(dir).then(async () => {
      if (projectMeta.features?.showEditorAlways) {
        // TODO: Convert this to a task at a higher level
        Deno.writeTextFile(
          path.join(dir, "context.json"),
          JSON.stringify(context),
        );
        // TODO: Convert this to a task at a higher level
        Deno.writeTextFile(
          path.join(dir, "definition.json"),
          JSON.stringify(page),
        );
      }

      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        html,
      );

      // TODO: Decouple js related logic from a worker. The check can
      // be done on a higher level at `build` and the converted to a task
      if (js) {
        await Deno.writeTextFile(path.join(dir, "index.js"), js);
      }
    });

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
        outputPath,
        data,
      },
    } = e.data;

    await Deno.writeTextFile(outputPath, data);
  }

  self.postMessage({});
};

async function writeScript(
  outputPath: string,
  scriptName: string,
  scriptPath?: string,
) {
  if (!scriptPath) {
    return Promise.resolve();
  }

  const script = await compileScript({
    path: scriptPath,
    name: scriptName,
    mode: "production",
  });

  return Deno.writeTextFile(path.join(outputPath, scriptName), script.content);
}
