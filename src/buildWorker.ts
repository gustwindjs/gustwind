// import { fs, path } from "../deps.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import type { Components } from "../types.ts";

self.onmessage = (e) => {
  const { dir, components }: { dir: string; components: Components } = e.data;

  console.log(dir);

  // ReferenceError: window is not defined
  // const renderPage = getPageRenderer({ components, mode: "production" });

  /*
  const [html, js] = await renderPage(route, filePath, context, page);

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
