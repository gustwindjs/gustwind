import {
  generateSitemap,
  sitemapToXML,
} from "https://deno.land/x/sitemap@v1.1.1/mod.ts";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

// Note that this works only in production mode for now!
const plugin: Plugin = {
  meta: {
    name: "gustwind-sitemap-plugin",
    description: "${name} writes a sitemap.xml file based on project output.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init(
    { cwd, outputDirectory },
  ) {
    return {
      finishBuild: async ({ send }) => {
        const meta = await send("gustwind-meta-plugin", {
          type: "getMeta",
          payload: undefined,
        });

        const sitemap = await generateSitemap(
          // @ts-expect-error How to type this?
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
