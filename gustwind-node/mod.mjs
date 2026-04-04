import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { build, stop } from "esbuild";

let runtimePromise;
globalThis.__gustwindEsbuild = { build, stop };

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const result = await build({
        bundle: true,
        entryPoints: [fileURLToPath(new URL("./mod.ts", import.meta.url))],
        format: "esm",
        logLevel: "silent",
        packages: "external",
        platform: "node",
        target: ["node18"],
        write: false,
      });

      try {
        const output = result.outputFiles?.[0]?.text;

        if (!output) {
          throw new Error("Failed to bundle gustwind-node/mod.ts");
        }

        return await import(
          `data:text/javascript;base64,${
            Buffer.from(output).toString("base64")
          }`
        );
      } finally {
        stop();
      }
    })().catch((error) => {
      runtimePromise = undefined;
      throw error;
    });
  }

  return await runtimePromise;
}

async function initRender(...args) {
  return await (await loadRuntime()).initRender(...args);
}

async function initNodeRender(...args) {
  return await (await loadRuntime()).initNodeRender(...args);
}

export { initNodeRender, initRender };
