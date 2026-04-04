// deno-lint-ignore no-explicit-any
type EsbuildBuild = (...args: any[]) => Promise<{ outputFiles?: { text: string }[] }>;
type EsbuildStop = () => void;
type EsbuildModule = { build: EsbuildBuild; stop: EsbuildStop };

let esbuildPromise: Promise<EsbuildModule> | undefined;

async function getEsbuild(): Promise<EsbuildModule> {
  if (esbuildPromise) {
    return esbuildPromise;
  }

  if ("Deno" in globalThis) {
    esbuildPromise = import("https://deno.land/x/esbuild@v0.19.4/mod.js").then(
      (module) => ({
        build: module.build,
        stop: module.stop,
      }),
    );
  } else {
    esbuildPromise = import("esbuild").then((module) => ({
      build: module.build,
      stop: module.stop,
    }));
  }

  return esbuildPromise;
}

async function stopEsbuild() {
  if (!esbuildPromise) {
    return;
  }

  (await esbuildPromise).stop();
  esbuildPromise = undefined;
}

export { getEsbuild, stopEsbuild };
