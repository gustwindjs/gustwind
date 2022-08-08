import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../index.ts";

Deno.test("attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: { href: "testing", empty: "" },
        children: "testing",
      },
    }),
    '<a href="testing" empty>testing</a>',
  );
});

Deno.test("gets attributes from context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: {
          href: { utility: "get", parameters: ["context", "test"] },
          empty: "",
        },
        children: "testing",
      },
      context: {
        test: "test",
      },
    }),
    '<a href="test" empty>testing</a>',
  );
});

Deno.test("evaluates attributes from context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: {
          href: {
            utility: "concat",
            parameters: ["foo", {
              utility: "get",
              parameters: ["context", "test"],
            }],
          },
          empty: "",
        },
        children: "testing",
      },
      context: {
        test: "test",
      },
    }),
    '<a href="footest" empty>testing</a>',
  );
});

Deno.test("undefined attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: { href: undefined },
        children: "testing",
      },
    }),
    "<a>testing</a>",
  );
});

Deno.test("undefined attributes with get", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: {
          href: { "utility": "get", "parameters": ["dummy", "test"] },
        },
        children: "testing",
      },
    }),
    "<a>testing</a>",
  );
});

Deno.test("attributes without children", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: { href: "testing" },
      },
    }),
    '<a href="testing"></a>',
  );
});

Deno.test("retains empty attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: { href: "" },
      },
    }),
    "<a href></a>",
  );
});

Deno.test("removes undefined attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "a",
        attributes: { href: undefined },
      },
    }),
    "<a></a>",
  );
});
