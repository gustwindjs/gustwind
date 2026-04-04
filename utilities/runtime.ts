type DenoLike = {
  env: {
    get(name: string): string | undefined;
  };
};

type ProcessLike = {
  env?: Record<string, string | undefined>;
};

function getEnv(name: string): string | undefined {
  try {
    const deno = (globalThis as typeof globalThis & { Deno?: DenoLike }).Deno;

    return deno?.env.get(name);
  } catch (_) {
    // Accessing Deno.env can require permissions.
  }

  try {
    const processObject =
      (globalThis as typeof globalThis & { process?: ProcessLike }).process;

    return processObject?.env?.[name];
  } catch (_) {
    // Accessing process.env can also be permission-gated under Deno's Node shim.
  }

  return undefined;
}

function isDebugEnabled() {
  return getEnv("DEBUG") === "1";
}

export { getEnv, isDebugEnabled };
