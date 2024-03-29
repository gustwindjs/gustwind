import * as path from "node:path";
import { contentType } from "https://deno.land/std@0.207.0/media_types/mod.ts";
import { respond } from "../gustwind-utilities/respond.ts";

function gustwindServe({ cwd, input, port }: {
  cwd: string;
  input: string;
  port: number;
}) {
  return () =>
    Deno.serve({ port }, async ({ url }) => {
      const { pathname } = new URL(url);
      const assetPath = path.join(
        cwd,
        input,
        pathname,
        path.extname(pathname) ? "" : "index.html",
      );

      try {
        const asset = await Deno.readFile(assetPath);

        return respond(200, asset, contentType(path.extname(assetPath)));
      } catch (_) {
        console.error("Failed to find", assetPath);
      }

      return respond(404, "No matching route");
    });
}

export { gustwindServe };
