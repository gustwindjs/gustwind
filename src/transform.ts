import { importScript } from "../utils/importScript.ts";
import type { Transform } from "../types.ts";

async function transform(
  transformsPath: string,
  transformNames?: Transform[],
  input?: unknown,
): Promise<Record<string, unknown>> {
  if (!transformNames) {
    return Promise.resolve({ content: input });
  }

  if ("Deno" in window) {
    const path = await import("https://deno.land/std@0.107.0/path/mod.ts");
    const transforms = await Promise.all(
      transformNames.map((name) =>
        import(path.join(transformsPath, `${name}.ts`))
      ),
    );

    return transforms.reduce(
      (input, current) => current.default(input),
      input,
    );
  }

  // In the browser now
  // @ts-ignore How to type the browser version?
  return Promise.all(
    transformNames.map((name) => importScript(`/transforms/${name}.js`)),
  );
}

export default transform;
