import { path } from "../server-deps.ts";
import type { ProjectMeta } from "../types.ts";

async function getRender(projectMeta: ProjectMeta) {
  // TODO: Add logic against url based plugins
  const rendererPath = path.join(Deno.cwd(), projectMeta.renderer.path);
  const { render } = (await import(rendererPath).then((m) => m.renderer))(
    projectMeta,
    projectMeta.renderer.options,
  );

  return render;
}

export { getRender };
