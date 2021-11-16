/// <reference lib="webworker" />
import { nanoid } from "https://cdn.skypack.dev/nanoid@3.1.30?min";
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
        Deno.writeTextFile(
          path.join(dir, "context.json"),
          JSON.stringify(context),
        );
        Deno.writeTextFile(
          path.join(dir, "definition.json"),
          JSON.stringify(page),
        );
      }

      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        html,
      );
      if (js) {
        await Deno.writeTextFile(path.join(dir, "index.js"), js);
      }
    });

    DEBUG && console.log("worker - finished build", id, route, filePath);
  }

  self.postMessage({});
};
