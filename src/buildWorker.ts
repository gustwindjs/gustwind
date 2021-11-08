// import { fs, path } from "../deps.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import type { Components, DataContext, Page, ProjectMeta } from "../types.ts";

self.onmessage = async (e) => {
  const {
    transformsPath,
    route,
    filePath,
    dir,
    components,
    projectMeta,
    context,
    page,
  }: {
    transformsPath: string;
    route: string;
    filePath: string;
    dir: string;
    components: Components;
    projectMeta: ProjectMeta;
    context: DataContext;
    page: Page;
  } = e.data;

  // ReferenceError: window is not defined
  const renderPage = getPageRenderer({
    transformsPath,
    components,
    mode: "production",
    projectMeta,
  });

  const [html, js] = await renderPage(route, filePath, context, page);

  console.log(html, js);

  /*
  fs.ensureDir(dir).then(() => {
    Deno.writeTextFile(
      path.join(dir, "context.json"),
      JSON.stringify(context),
    );
    Deno.writeTextFile(
      path.join(dir, "definition.json"),
      JSON.stringify(page),
    );
    Deno.writeTextFile(
      path.join(dir, "index.html"),
      html,
    );
    if (js) {
      Deno.writeTextFile(path.join(dir, "index.js"), js);
    }
  });
  */
  self.close();
};
