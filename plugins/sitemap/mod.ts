import {
  generateSitemap,
  sitemapToXML,
} from "https://deno.land/x/sitemap@v1.1.1/mod.ts";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

// Note that this works only in production mode for now!
const plugin: Plugin<{ metaPath: string }> = {
  meta: {
    name: "gustwind-sitemap-plugin",
  },
  init: async (
    { cwd, options: { metaPath }, outputDirectory, load },
  ) => {
    if (!metaPath) {
      throw new Error("Missing metaPath");
    }

    const meta = await load.json<{ url: string }>({
      path: metaPath,
      type: "meta",
    });

    return {
      finishBuild: async () => {
        const sitemap = await generateSitemap(
          meta.url,
          path.join(cwd, outputDirectory),
        );
        const sitemapXML = sitemapToXML(sitemap);

        return [{
          type: "writeTextFile",
          payload: {
            outputDirectory,
            file: "sitemap.xml",
            data: sitemapXML,
          },
        }];
      },
    };
  },
};

export { plugin };
