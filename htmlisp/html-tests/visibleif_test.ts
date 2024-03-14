import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with a visibleIf enabled", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: false,
      },
    }),
    "",
  );
});

Deno.test("element with a visibleIf disabled", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: true,
      },
    }),
    "<div>foo</div>",
  );
});

Deno.test("element with a complex visibleIf", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<div &visibleIf="(and (get context showToc) (get context isAdmin))">foo</div>`,
      context: {
        showToc: false,
        isAdmin: false,
      },
    }),
    "",
  );
});
