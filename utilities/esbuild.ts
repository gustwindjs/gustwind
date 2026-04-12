type EsbuildBuild = (...args: any[]) => Promise<{ outputFiles?: { text: string }[] }>;
type EsbuildStop = () => void;
type EsbuildModule = { build: EsbuildBuild; stop: EsbuildStop };

let esbuildPromise: Promise<EsbuildModule> | undefined;

async function getEsbuild(): Promise<EsbuildModule> {
  if (esbuildPromise) {
    return esbuildPromise;
  }

  esbuildPromise = import("esbuild").then((module) => ({
    build: module.build,
    stop: module.stop,
  }));

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
