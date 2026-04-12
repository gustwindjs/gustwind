import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("doctype", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: "<!DOCTYPE html>" }),
    "<!DOCTYPE html>",
  );
});

test("doctype and content", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<!DOCTYPE html><div &title="(get context meta.siteName)">hello</div>`,
      context: {
        meta: { siteName: "demo" },
      },
    }),
    `<!DOCTYPE html><div title="demo">hello</div>`,
  );
});

test("doctype and content with a newline", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<!DOCTYPE html>
    <div &title="(get context meta.siteName)">hello</div>`,
      context: {
        meta: { siteName: "demo" },
      },
    }),
    `<!DOCTYPE html><div title="demo">hello</div>`,
  );
});
