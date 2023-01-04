import { Server } from "https://deno.land/std@0.161.0/http/server.ts";
import { lookup } from "https://deno.land/x/media_types@v3.0.3/mod.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import { path } from "../server-deps.ts";

function gustwindServe({ cwd, input, port }: {
  cwd: string;
  input: string;
  port: number;
}) {
  const server = new Server({
    handler: async ({ url }) => {
      const { pathname } = new URL(url);
      const assetPath = path.join(
        cwd,
        input,
        pathname,
        path.extname(pathname) ? "" : "index.html",
      );

      try {
        const asset = await Deno.readFile(assetPath);

        return respond(200, asset, lookup(assetPath));
      } catch (_) {
        console.error("Failed to find", assetPath);
      }

      return respond(404, "No matching route");
    },
  });
  const listener = Deno.listen({ port });

  return () => server.serve(listener);
}

export { gustwindServe };
