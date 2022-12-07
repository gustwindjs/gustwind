// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import type { Context, Meta, Mode, ProjectMeta, Route } from "../types.ts";
import { applyUtilities } from "../breezewind/applyUtility.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";

async function getContext(
  { mode, url, projectMeta, route }: {
    mode: Mode;
    url: string;
    projectMeta: ProjectMeta;
    route: Route;
  },
) {
  const runtimeMeta: Meta = { built: (new Date()).toString() };

  // The assumption here is that all the page scripts are compiled with Gustwind.
  // TODO: It might be a good idea to support third-party scripts here as well
  /*
  let pageScripts =
    route.scripts?.slice(0).map((s) => ({ type: "module", src: `/${s}.js` })) ||
    [];
  if (projectMeta.scripts) {
    pageScripts = pageScripts.concat(projectMeta.scripts);
  }
  */

  // TODO: Rename pagePath as url across the project
  if (mode === "development") {
    runtimeMeta.pagePath = url;
  }
  const context: Context = {
    pagePath: url,
    projectMeta,
    ...route.context,
  };
  const props = {
    ...runtimeMeta,
    ...projectMeta.meta,
    ...route.meta,
  };
  // TODO: This feels like a break in abstraction. Push to a plugin!
  context.meta = await applyUtilities(
    props,
    // @ts-expect-error This is ok
    defaultUtilities,
    { context },
  );

  return context;
}

export { getContext };
