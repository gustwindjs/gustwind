import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { buildSitemapXml, plugin } from "./mod.ts";

test(`plugin declares metadata and writes sitemap output`, async () => {
  const outputDirectory = await createOutputDirectory({
    "index.html": "<html></html>",
    "draft/index.html": "<html></html>",
  });
  const api = await plugin.init({
    cwd: path.dirname(outputDirectory),
    outputDirectory: path.basename(outputDirectory),
    options: { exclude: ["/draft/"], excludeNoindex: true },
  } as Parameters<typeof plugin.init>[0]);
  const tasks = await api.finishBuild?.({
    pluginContext: {},
    send: async (pluginName: string, message: unknown) => {
      assert.equal(pluginName, "gustwind-meta-plugin");
      assert.deepEqual(message, { type: "getMeta", payload: undefined });

      return { url: "https://example.com" };
    },
  });

  assert.deepEqual(plugin.meta, {
    name: "gustwind-sitemap-plugin",
    description: "${name} writes a sitemap.xml file based on project output.",
    dependsOn: ["gustwind-meta-plugin"],
  });
  assert.deepEqual(tasks, [
    {
      type: "writeTextFile",
      payload: {
        outputDirectory: path.basename(outputDirectory),
        file: "sitemap.xml",
        data: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          "  <url>",
          "    <loc>https://example.com/</loc>",
          "  </url>",
          "</urlset>",
        ].join("\n"),
      },
    },
  ]);
});

test(`buildSitemapXml lists public html and xml paths`, async () => {
  const outputDirectory = await createOutputDirectory({
    "index.html": "<html></html>",
    "about/index.html": "<html></html>",
    "about/team.html": "<html></html>",
    "feed.xml": "<rss></rss>",
    "asset.txt": "asset",
    "sitemap.xml": "old sitemap",
  });

  assert.equal(
    await buildSitemapXml({
      siteUrl: "https://example.com",
      outputDirectory,
    }),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "  <url>",
      "    <loc>https://example.com/about/</loc>",
      "  </url>",
      "  <url>",
      "    <loc>https://example.com/about/team.html</loc>",
      "  </url>",
      "  <url>",
      "    <loc>https://example.com/feed.xml</loc>",
      "  </url>",
      "  <url>",
      "    <loc>https://example.com/</loc>",
      "  </url>",
      "</urlset>",
    ].join("\n"),
  );
});

test(`buildSitemapXml excludes configured paths`, async () => {
  const outputDirectory = await createOutputDirectory({
    "index.html": "<html></html>",
    "draft/index.html": "<html></html>",
  });

  assert.equal(
    await buildSitemapXml({
      siteUrl: "https://example.com",
      outputDirectory,
      exclude: ["/draft/"],
    }),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "  <url>",
      "    <loc>https://example.com/</loc>",
      "  </url>",
      "</urlset>",
    ].join("\n"),
  );
});

test(`buildSitemapXml excludes html pages with noindex robots meta`, async () => {
  const outputDirectory = await createOutputDirectory({
    "index.html": "<html><head><meta name=\"robots\" content=\"index\"></head></html>",
    "description.html": [
      "<html><head>",
      "<meta name=\"description\" content=\"noindex should not matter\">",
      "</head></html>",
    ].join(""),
    "private.html": [
      "<html><head>",
      "<meta NAME=\"robots\" CONTENT=\"nofollow, noindex\">",
      "</head></html>",
    ].join(""),
    "private-content-first.html": [
      "<html><head>",
      "<meta CONTENT=\"nofollow, noindex\" NAME=\"robots\">",
      "</head></html>",
    ].join(""),
    "private.xml": "<robots><meta name=\"robots\" content=\"noindex\" /></robots>",
  });

  assert.equal(
    await buildSitemapXml({
      siteUrl: "https://example.com",
      outputDirectory,
      excludeNoindex: true,
    }),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "  <url>",
      "    <loc>https://example.com/description.html</loc>",
      "  </url>",
      "  <url>",
      "    <loc>https://example.com/</loc>",
      "  </url>",
      "  <url>",
      "    <loc>https://example.com/private.xml</loc>",
      "  </url>",
      "</urlset>",
    ].join("\n"),
  );
});

test(`buildSitemapXml includes noindex html unless exclusion is enabled`, async () => {
  const outputDirectory = await createOutputDirectory({
    "private.html": "<html><head><meta name=\"robots\" content=\"noindex\"></head></html>",
  });

  assert.match(
    await buildSitemapXml({
      siteUrl: "https://example.com",
      outputDirectory,
    }),
    /https:\/\/example.com\/private.html/,
  );
});

test(`buildSitemapXml escapes generated loc values`, async () => {
  const outputDirectory = await createOutputDirectory({
    "index.html": "<html></html>",
  });

  assert.match(
    await buildSitemapXml({
      siteUrl: "https://example.com?x=<one>&y='two'&z=\"three\"",
      outputDirectory,
    }),
    /https:\/\/example.com\?x=&lt;one&gt;&amp;y=&apos;two&apos;&amp;z=&quot;three&quot;\//,
  );
});

async function createOutputDirectory(files: Record<string, string>) {
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "gustwind-sitemap-test-"),
  );

  await Promise.all(
    Object.entries(files).map(async ([filePath, contents]) => {
      const absolutePath = path.join(outputDirectory, filePath);

      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents);
    }),
  );

  return outputDirectory;
}
