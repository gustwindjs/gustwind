import { esbuild, fs, path } from "./server-deps.ts";
import { compileScripts } from "./utilities/compileScripts.ts";

function compilePlugins() {
  return Promise.all([
    compilePluginScripts(
      "./plugins/editor/scripts",
      "./plugins/editor/compiled-scripts",
    ),
    compilePluginScripts(
      "./plugins/websocket/scripts",
      "./plugins/websocket/compiled-scripts",
    ),
  ]);
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
  } finally {
    esbuild.stop();
  }
}

if (import.meta.main) {
  await compilePlugins();
}

export { compilePlugins };
