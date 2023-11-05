import * as esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import { fs, path } from "./server-deps.ts";
import { compileTypeScript } from "./utilities/compileTypeScript.ts";
import editorScriptsToCompile from "./plugins/editor/scriptsToCompile.ts";
import webSocketScriptsToCompile from "./plugins/websocket/scriptsToCompile.ts";

async function compilePlugins() {
  await compilePluginScripts(
    "./plugins/editor",
    editorScriptsToCompile,
  );
  await compilePluginScripts(
    "./plugins/websocket",
    webSocketScriptsToCompile,
  );
  // https://esbuild.github.io/getting-started/#deno
  esbuild.stop();
}

async function compilePluginScripts(
  pluginPath: string,
  scriptsToCompile: {
    name: string;
    isExternal?: boolean;
    externals?: string[];
  }[],
) {
  const outputPath = path.join(pluginPath, "compiled-scripts");

  await fs.ensureDir(pluginPath);
  await fs.ensureDir(outputPath);

  try {
    await Promise.all(
      scriptsToCompile.map(async ({ name, externals }) =>
        Deno.writeTextFile(
          path.join(outputPath, `${name}.ts`),
          await compileTypeScript(
            path.join(Deno.cwd(), pluginPath, "scripts", `${name}.ts`),
            "production",
            externals,
          ),
        )
      ),
    );
  } catch (error) {
    console.error(error);
  }
}

if (import.meta.main) {
  await compilePlugins();
}

export { compilePlugins };
