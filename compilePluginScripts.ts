import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import { fs, path } from "./server-deps.ts";
import { compileScripts } from "./utilities/compileScripts.ts";

async function compilePlugins() {
  await compilePluginScripts(
    "./plugins/editor/scripts",
    "./plugins/editor/compiled-scripts",
  );
  await compilePluginScripts(
    "./plugins/websocket/scripts",
    "./plugins/websocket/compiled-scripts",
  );
  // https://esbuild.github.io/getting-started/#deno
  esbuild.stop();
}

async function compilePluginScripts(inputPath: string, outputPath: string) {
  await fs.ensureDir(inputPath);
  await fs.ensureDir(outputPath);

  try {
    const scriptsWithFiles = await compileScripts(inputPath, "production");

    await Promise.all(
      scriptsWithFiles.map((
        { name, content }: { name: string; content: string },
      ) => Deno.writeTextFile(path.join(outputPath, name), content)),
    );
  } catch (error) {
    console.error(error);
  }
}

if (import.meta.main) {
  await compilePlugins();
}

export { compilePlugins };
