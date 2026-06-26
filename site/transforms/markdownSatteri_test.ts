import assert from "node:assert/strict";
import test from "node:test";
import getMarkdownSatteri from "./markdownSatteri.ts";

test("satteri markdown transform renders Gustwind markdown extensions", async () => {
  const markdown = getMarkdownSatteri({
    load: {
      dir: async () => [],
      json: async () => {
        throw new Error("json should not be called");
      },
      module: async () => {
        throw new Error("module should not be called");
      },
      textFile: async () => "",
      textFileSync: (path) => path === "/demo.ts" ? "const demo = true;\n" : "",
    },
    render: async () => "",
    renderRaw: (input) => ({ __htmlispRaw: true, value: String(input) }),
    renderSync: ({ componentName }) => `<div data-component="${componentName}"></div>`,
  });

  const result = await markdown([
    "# Hello `World`",
    "",
    ":Demo:",
    "",
    "[<file>](/demo.ts)",
    "",
    "- item",
    "",
    "```unknown",
    "<demo>",
    "```",
  ].join("\n"));

  assert.deepEqual(result.tableOfContents, [{
    level: 1,
    slug: "-hello-world",
    text: "Hello World",
  }]);
  assert.match(result.content, /<h1 id="-hello-world">Hello <code>World<\/code><a class="ml-2 no-underline text-sm align-middle mask-text" href="#-hello-world">🔗<\/a><\/h1>/);
  assert.match(result.content, /<div data-component="Demo"><\/div>/);
  assert.match(result.content, /<code class="ts">/);
  assert.match(result.content, /<ul class="list-disc list-inside">/);
  assert.match(result.content, /<code class="plaintext">&lt;demo&gt;\n<\/code>/);
});
