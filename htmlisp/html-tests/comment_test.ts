import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("element with a comment", async () => {
  assert.deepEqual(
    await htmlispToHTML(
      {
        htmlInput:
          `<div __reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/">foo</div>`,
      },
    ),
    "<div>foo</div>",
  );
});
