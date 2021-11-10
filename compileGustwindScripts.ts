import { esbuild, fs, path } from "./deps.ts";
import { compileScripts } from "./utils/compileScripts.ts";

async function compileGustwindScripts(scriptsPath: string) {
  const gustwindScriptsPath = "./gustwindScripts";

  await fs.ensureDir(gustwindScriptsPath);

  try {
    const scriptsWithFiles = await compileScripts(scriptsPath, "production");

    await Promise.all(
      scriptsWithFiles.map((
        { name, content }: { name: string; content: string },
      ) => Deno.writeTextFile(path.join(gustwindScriptsPath, name), content)),
    );

    esbuild.stop();
  } catch (error) {
    console.error(error);
  }
}

compileGustwindScripts("./scripts");
