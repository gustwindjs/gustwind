import * as path from "node:path";
import { readdir } from "node:fs/promises";
import type { Plugin } from "../../types.ts";
import { urlJoin } from "../../utilities/urlJoin.ts";

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
        const sitemapXML = await buildSitemapXml({
          // @ts-expect-error How to type this?
          siteUrl: meta.url,
          outputDirectory: path.join(cwd, outputDirectory),
        });

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

async function buildSitemapXml(
  { siteUrl, outputDirectory }: {
    siteUrl: string;
    outputDirectory: string;
  },
) {
  const entries = await listPublicPaths(outputDirectory);
  const urls = entries
    .filter((entry) => entry !== "sitemap.xml")
    .map((entry) => {
      const pathname = toSitemapPath(entry);

      return [
        "  <url>",
        `    <loc>${escapeXml(urlJoin(siteUrl, pathname))}</loc>`,
        "  </url>",
      ].join("\n");
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

async function listPublicPaths(
  directoryPath: string,
  parentPath = "",
): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const publicPaths: string[] = [];

  for (const entry of entries) {
    const relativePath = parentPath
      ? path.join(parentPath, entry.name)
      : entry.name;
    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      publicPaths.push(...await listPublicPaths(absolutePath, relativePath));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".html") || entry.name.endsWith(".xml"))
    ) {
      publicPaths.push(relativePath);
    }
  }

  return publicPaths;
}

function toSitemapPath(relativePath: string) {
  if (relativePath === "index.html") {
    return "/";
  }

  if (relativePath.endsWith(path.join(path.sep, "index.html"))) {
    const withoutIndex = relativePath.slice(0, -("index.html".length));

    return `/${withoutIndex.replaceAll(path.sep, "/")}`;
  }

  return `/${relativePath.replaceAll(path.sep, "/")}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export { plugin };
