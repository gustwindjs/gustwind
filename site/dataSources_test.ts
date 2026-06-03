import assert from "node:assert/strict";
import test from "node:test";
import { raw } from "../htmlisp/mod.ts";
import { init } from "./dataSources.ts";

test("site data sources reuse markdown file reads and headmatter parsing", async () => {
  const markdown = [
    "---",
    "slug: hello",
    "title: Hello",
    "date: 2024-01-01",
    "keywords:",
    "  - docs",
    "---",
    "# Hello",
    "",
    "World",
  ].join("\n");
  const loadCounts = new Map<string, number>();
  const api = init({
    load: {
      dir: async () => [{ name: "hello.md", path: "/docs/hello.md" }],
      json: async () => {
        throw new Error("json should not be called");
      },
      module: async () => {
        throw new Error("module should not be called");
      },
      textFile: async (path) => {
        loadCounts.set(path, (loadCounts.get(path) || 0) + 1);
        return markdown;
      },
      textFileSync: () => markdown,
    },
    render: async () => "",
    renderRaw: raw,
    renderSync: () => "",
  });

  await api.indexMarkdown("/docs");
  await api.processMarkdown({ path: "/docs/hello.md" }, { parseHeadmatter: true, skipFirstLine: false });
  await api.processMarkdown({ path: "/docs/hello.md" }, { parseHeadmatter: false, skipFirstLine: false });

  assert.equal(loadCounts.get("/docs/hello.md"), 1);
});

test("site markdown code blocks fall back to plaintext", async () => {
  const markdown = [
    "```",
    "<demo>",
    "```",
    "",
    "```unknown",
    "<demo>",
    "```",
  ].join("\n");
  const api = init({
    load: {
      dir: async () => [],
      json: async () => {
        throw new Error("json should not be called");
      },
      module: async () => {
        throw new Error("module should not be called");
      },
      textFile: async () => markdown,
      textFileSync: () => markdown,
    },
    render: async () => "",
    renderRaw: raw,
    renderSync: () => "",
  });

  const result = await api.processMarkdown(
    { path: "/docs/hello.md" },
    { parseHeadmatter: false, skipFirstLine: false },
  );

  assert.match(
    result.content,
    /<code class="plaintext">&lt;demo&gt;\n<\/code>/,
  );
  assert.equal(
    (result.content.match(/class="plaintext"/g) || []).length,
    2,
  );
});
