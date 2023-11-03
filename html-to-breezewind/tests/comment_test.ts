import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("element with a comment", () => {
  assertEquals(
    htmlToBreezewind(
      `<div __reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      attributes: {},
    },
  );
});
