type ProcessLike = {
  env?: Record<string, string | undefined>;
};

function getEnv(name: string): string | undefined {
  const processObject =
    (globalThis as typeof globalThis & { process?: ProcessLike }).process;

  return processObject?.env?.[name];
}

function isDebugEnabled() {
  return getEnv("DEBUG") === "1";
}

export { getEnv, isDebugEnabled };
