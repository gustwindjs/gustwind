import * as path from "node:path";
import type { Scripts, Send } from "../../types.ts";
import { normalizeScriptName } from "./build.ts";
import type {
  RouteScripts,
  ScriptContextInput,
  ScriptEntryAssets,
  ScriptPluginContext,
} from "./types.ts";

function prepareScriptContext({
  builtEntryAssets,
  cwd,
  globalScripts,
  mode,
  pluginContext,
  routeScripts,
  send,
}: {
  builtEntryAssets: ScriptEntryAssets;
  cwd: string;
  globalScripts: Scripts;
  mode: string;
  pluginContext: ScriptPluginContext;
  routeScripts: RouteScripts;
  send: Send;
}) {
  const scripts = collectContextScripts({
    builtEntryAssets,
    cwd,
    mode,
    pluginContext,
    routeScripts,
  });
  const scriptTags = scripts.map(({ name, src, srcPrefix, ...rest }) => ({
    type: "module",
    ...rest,
    src: src || (srcPrefix || "/") + name.replace(".ts", ".js"),
  }));
  const styles = getScriptStyles(scripts, builtEntryAssets);

  registerDynamicScriptRoutes(scripts, send);

  // TODO: Add uniqueness check for global scripts to avoid injecting the same script multiple times
  // Global scripts don't need processing since they are in the right format already
  return {
    context: {
      styles,
      scripts: globalScripts
        .concat(pluginContext.receivedGlobalScripts)
        .concat(scriptTags),
    },
  };
}

function collectContextScripts({
  builtEntryAssets,
  cwd,
  mode,
  pluginContext,
  routeScripts,
}: {
  builtEntryAssets: ScriptEntryAssets;
  cwd: string;
  mode: string;
  pluginContext: ScriptPluginContext;
  routeScripts: RouteScripts;
}): ScriptContextInput[] {
  const { foundScripts, receivedScripts } = pluginContext;
  const routeScriptNames = routeScripts.map(({ name }) => name);
  const foundScriptNames = foundScripts.map(({ name }) => name);
  const foundScriptPaths = Object.fromEntries(
    foundScripts.map(({ name, path }) => [name, path]),
  );

  if (
    !routeScriptNames.every((name) => foundScriptNames.includes(`${name}.ts`))
  ) {
    console.error(foundScriptNames, routeScriptNames);
    throw new Error("Route script is missing from the scripts directory");
  }

  return receivedScripts
    .filter(({ isExternal }) => !isExternal)
    .map(({ name, localPath, remotePath }) => ({
      name,
      src:
        mode === "production"
          ? builtEntryAssets[normalizeScriptName(name)]?.file
          : getDevScriptPath(
              import.meta.url.startsWith("file:///") ? localPath : remotePath,
              cwd,
            ),
    }))
    .concat(
      routeScripts.map(({ name, ...rest }) => ({
        name: `${name}.ts`,
        src:
          mode === "production"
            ? builtEntryAssets[name]?.file
            : getDevScriptPath(foundScriptPaths[`${name}.ts`], cwd),
        ...rest,
      })),
    );
}

function getScriptStyles(
  scripts: ScriptContextInput[],
  builtEntryAssets: ScriptEntryAssets,
) {
  return Array.from(
    new Set(
      scripts.flatMap(
        ({ name }) => builtEntryAssets[normalizeScriptName(name)]?.css || [],
      ),
    ),
  ).map((href) => ({ href, rel: "stylesheet" }));
}

function registerDynamicScriptRoutes(
  scripts: ScriptContextInput[],
  send: Send,
) {
  scripts.forEach(({ name, src }) => {
    if (src) {
      return;
    }

    send("*", {
      type: "addDynamicRoute",
      payload: { path: name.replace(".ts", ".js") },
    });
  });
}

function getDevScriptPath(scriptPath: string | undefined, cwd: string) {
  if (!isLocalDevScriptPath(scriptPath)) {
    return undefined;
  }

  if (path.isAbsolute(scriptPath)) {
    return getAbsoluteDevScriptPath(scriptPath, cwd);
  }

  const normalizedPath = scriptPath.startsWith("./")
    ? scriptPath.slice(2)
    : scriptPath;

  return `/${normalizedPath.split(path.sep).join("/")}`;
}

function isLocalDevScriptPath(
  scriptPath: string | undefined,
): scriptPath is string {
  return Boolean(
    scriptPath &&
      !scriptPath.startsWith("http://") &&
      !scriptPath.startsWith("https://"),
  );
}

function getAbsoluteDevScriptPath(scriptPath: string, cwd: string) {
  const relativePath = path.relative(cwd, scriptPath);

  return isProjectRelativePath(relativePath)
    ? toDevRoutePath(relativePath)
    : `/@fs/${toBrowserPath(scriptPath)}`;
}

function isProjectRelativePath(relativePath: string) {
  return !relativePath.startsWith("..");
}

function toDevRoutePath(scriptPath: string) {
  return `/${toBrowserPath(scriptPath)}`;
}

function toBrowserPath(scriptPath: string) {
  return scriptPath.split(path.sep).join("/");
}

export { prepareScriptContext };
