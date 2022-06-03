import { esbuild, fs, path } from "./server-deps.ts";
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

if (import.meta.main) {
  compileGustwindScripts("./scripts");
}

export { compileGustwindScripts };
