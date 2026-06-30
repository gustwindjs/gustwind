import * as path from "node:path";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import type { Plugin } from "../../types.ts";
import { urlJoin } from "../../utilities/urlJoin.ts";

type SitemapPluginOptions = {
  exclude?: string[];
  excludeNoindex?: boolean;
};

// Note that this works only in production mode for now!
const plugin: Plugin<SitemapPluginOptions> = {
  meta: {
    name: "gustwind-sitemap-plugin",
    description: "${name} writes a sitemap.xml file based on project output.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({ cwd, outputDirectory, options }) {
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
          exclude: options.exclude,
          excludeNoindex: options.excludeNoindex,
        });

        return [
          {
            type: "writeTextFile",
            payload: {
              outputDirectory,
              file: "sitemap.xml",
              data: sitemapXML,
            },
          },
        ];
      },
    };
  },
};

async function buildSitemapXml({
  siteUrl,
  outputDirectory,
  exclude,
  excludeNoindex = false,
}: {
  siteUrl: string;
  outputDirectory: string;
  exclude?: string[];
  excludeNoindex?: boolean;
}) {
  const entries = await listPublicPaths(outputDirectory);
  const excludedPaths = new Set(exclude);
  const urls: string[] = [];

  for (const entry of entries) {
    if (entry === "sitemap.xml") {
      continue;
    }

    const pathname = toSitemapPath(entry);

    if (
      excludedPaths.has(pathname) ||
      (excludeNoindex && await isNoindexHtml(path.join(outputDirectory, entry)))
    ) {
      continue;
    }

    urls.push(
      [
        "  <url>",
        `    <loc>${escapeXml(urlJoin(siteUrl, pathname))}</loc>`,
        "  </url>",
      ].join("\n"),
    );
  }

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
    publicPaths.push(...await listPublicPathEntry(directoryPath, parentPath, entry));
  }

  return publicPaths;
}

async function listPublicPathEntry(
  directoryPath: string,
  parentPath: string,
  entry: Dirent,
) {
  const relativePath = parentPath
    ? path.join(parentPath, entry.name)
    : entry.name;
  const absolutePath = path.join(directoryPath, entry.name);

  if (entry.isDirectory()) {
    return listPublicPaths(absolutePath, relativePath);
  }

  return isPublicPathEntry(entry) ? [relativePath] : [];
}

function isPublicPathEntry(entry: Dirent) {
  return entry.isFile() && isSitemapFile(entry.name);
}

function isSitemapFile(fileName: string) {
  return fileName.endsWith(".html") || fileName.endsWith(".xml");
}

async function isNoindexHtml(filePath: string) {
  if (!filePath.endsWith(".html")) {
    return false;
  }

  const html = await readFile(filePath, "utf8");

  return hasNoindexRobotsMeta(html);
}

function hasNoindexRobotsMeta(html: string) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) =>
    getHtmlAttribute(tag, "name")?.toLowerCase() === "robots" &&
    getHtmlAttribute(tag, "content")?.toLowerCase().includes("noindex")
  );
}

function getHtmlAttribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))
    ?.[1];
}

function toSitemapPath(relativePath: string) {
  if (relativePath === "index.html") {
    return "/";
  }

  if (relativePath.endsWith(path.join(path.sep, "index.html"))) {
    const withoutIndex = relativePath.slice(0, -"index.html".length);

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

export { buildSitemapXml, plugin };
