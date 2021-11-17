/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { nanoid } from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import { compileScript } from "../utils/compileScripts.ts";
import { compileTypeScript } from "../utils/compileTypeScript.ts";
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

    // TODO: Decouple js related logic from a worker. The check can
    // be done on a higher level at `build` and the converted to a task
    const scriptName = path.basename(filePath, path.extname(filePath));
    const scriptPath = path.join(path.dirname(filePath), scriptName) +
      ".ts";

    let pageSource = "";

    if (await fs.exists(scriptPath)) {
      pageSource = await compileTypeScript(scriptPath, "production");
    }

    if (pageSource) {
      await Deno.writeTextFile(path.join(dir, "index.js"), pageSource);
    }

    const [html, context] = await renderPage({
      pathname: route,
      pagePath: filePath,
      page,
      extraContext,
      projectMeta,
      hasScript: !!pageSource,
    });

    if (page.layout !== "xml" && projectMeta.features?.showEditorAlways) {
      // TODO: Can this be pushed as a task?
      await Deno.writeTextFile(
        path.join(dir, "context.json"),
        JSON.stringify(context),
      );
    }

    if (page.layout === "xml") {
      await Deno.writeTextFile(dir.slice(0, -1), html);
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
