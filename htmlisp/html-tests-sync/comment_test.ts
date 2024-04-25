import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

Deno.test("element with a comment", async () => {
  assertEquals(
    await htmlispToHTMLSync(
      {
        htmlInput:
          `<div __reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/">foo</div>`,
      },
    ),
    "<div>foo</div>",
  );
});
