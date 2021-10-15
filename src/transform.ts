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

  // TODO: Make this browser aware and point to /transforms/<name>.js there
  // TODO: This needs a compilation pass too to compile transforms
  // In browser now
  return importScript(`/transforms/${name}.js`).then((o) => {
    // TODO: Make sure importScript returns something usable
    console.log("o", o);
  });
}

export default transform;
