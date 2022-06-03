import type { Mode, Transform } from "../types.ts";

async function transform(
  mode: Mode,
  transformsPath: string,
  transformNames?: Transform[],
  input?: unknown,
): Promise<Record<string, unknown>> {
  if (!transformNames) {
    // @ts-ignore The type is unknown here
    return Promise.resolve(input);
  }

  if ("Deno" in globalThis) {
    // TODO: Probably this will be removed if transform definition changes
    // Note that we shouldn't depend on server-deps.ts here as this file
    // needs to run in the browser as well.
    const path = await import("https://deno.land/std@0.142.0/path/mod.ts");
    const transforms = await Promise.all(
      transformNames.map((name) => {
        const transformPath = path.join(transformsPath, `${name}.ts`);

        Deno.env.get("DEBUG") === "1" &&
          console.log(
            "importing transform",
            transformPath,
            transformsPath,
            name,
          );

        return import(
          mode === "production"
            ? "file://" + transformPath
            : "file://" + transformPath + "?cache=" + new Date().getTime()
        );
      }),
    );

    return transforms.reduce(
      (input, current) => current.default(input),
      input,
    );
  }

  // In the browser now
  // @ts-ignore How to type the browser version?
  return Promise.all(
    transformNames.map((name) => import(`/transforms/${name}.js`)),
  );
}

export { transform };
