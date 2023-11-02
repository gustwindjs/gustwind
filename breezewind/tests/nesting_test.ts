import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../mod.ts";

const onlyChildren = { children: "testing" };
const emptySpan = { type: "span" };
const span = { type: "span", children: "testing" };

Deno.test("empty element", async () => {
  assertEquals(await breeze({ component: emptySpan }), "<span></span>");
});

Deno.test("array of elements", async () => {
  assertEquals(
    await breeze({ component: [emptySpan, emptySpan] }),
    "<span></span><span></span>",
  );
});

Deno.test("simple element", async () => {
  assertEquals(await breeze({ component: span }), "<span>testing</span>");
});

Deno.test("children element", async () => {
  assertEquals(await breeze({ component: onlyChildren }), "testing");
});

Deno.test("nested element", async () => {
  assertEquals(
    await breeze({ component: { type: "div", children: [span] } }),
    "<div><span>testing</span></div>",
  );
});

Deno.test("nested siblings", async () => {
  assertEquals(
    await breeze({ component: { type: "div", children: [span, span] } }),
    "<div><span>testing</span><span>testing</span></div>",
  );
});

Deno.test("nested children siblings", async () => {
  assertEquals(
    await breeze({
      component: { type: "div", children: [onlyChildren, onlyChildren] },
    }),
    "<div>testingtesting</div>",
  );
});

Deno.test("multi-level nesting", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: [{ type: "div", children: [span] }],
      },
    }),
    "<div><div><span>testing</span></div></div>",
  );
});
