import { fs, path } from "../deps.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import type { Components, DataContext, Page, ProjectMeta } from "../types.ts";

self.onmessage = async (e) => {
  const {
    route,
    filePath,
    dir,
    components,
    projectMeta,
    extraContext,
    page,
  }: {
    route: string;
    filePath: string;
    dir: string;
    components: Components;
    projectMeta: ProjectMeta;
    extraContext: DataContext;
    page: Page;
  } = e.data;
  const renderPage = getPageRenderer({
    components,
    mode: "production",
    projectMeta,
  });
  const [html, js, context] = await renderPage(
    route,
    filePath,
    page,
    extraContext,
  );

  await fs.ensureDir(dir).then(() => {
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

    Deno.writeTextFile(
      path.join(dir, "index.html"),
      html,
    );
    if (js) {
      Deno.writeTextFile(path.join(dir, "index.js"), js);
    }
  });

  self.postMessage({});
};
