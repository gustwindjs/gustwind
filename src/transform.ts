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
      transformNames.map((name) => {
        const transformPath = path.join(transformsPath, `${name}.ts`);

        Deno.env.get("DEBUG") === "1" &&
          console.log(
            "importing transform",
            transformPath,
            transformsPath,
            name,
          );

        return import("file://" + transformPath);
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
    transformNames.map((name) => importScript(`/transforms/${name}.js`)),
  );
}

export default transform;
