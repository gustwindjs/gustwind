import { importScript } from "./importScript.ts";

function transform(name?: string | unknown, input?: unknown): Promise<unknown> {
  if (!name) {
    return Promise.resolve(input);
  }

  if ("Deno" in window) {
    return import(`../transforms/${name}.ts`).then((o) =>
      o.default(input) || ""
    );
  }

  // In the browser now
  return importScript(`/transforms/${name}.js`);
}

export default transform;
