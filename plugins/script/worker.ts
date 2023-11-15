/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { compileTypeScript } from "../../utilities/compileTypeScript.ts";
import { fs, path } from "../../server-deps.ts";
import type { ScriptWorkerEvent } from "./types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: ScriptWorkerEvent = e.data;

  if (type === "writeScript") {
    const { payload: { outputDirectory, file, scriptPath, externals } } =
      e.data;

    DEBUG &&
      console.log(
        "worker - writing script",
        scriptPath,
        path.join(outputDirectory, file),
      );

    await fs.ensureDir(outputDirectory);
    await Deno.writeTextFile(
      path.join(outputDirectory, file),
      scriptPath.startsWith("http")
        ? await fetch(scriptPath).then((res) => res.text())
        : await compileTypeScript(scriptPath, "production", externals),
    );
  }

  self.postMessage({ type: "finished" });
};
