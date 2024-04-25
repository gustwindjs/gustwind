import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

Deno.test("element with a visibleIf enabled", async () => {
  assertEquals(
    await htmlispToHTMLSync({
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
    await htmlispToHTMLSync({
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
    await htmlispToHTMLSync({
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

Deno.test("component with visibleIf and boolean", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<li &visibleIf="(get props website)">
  <a &href="(get props website)">Website</a>
</li>`,
      props: {
        website: false,
      },
    }),
    "",
  );
});

Deno.test("component with visibleIf and string", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<li &visibleIf="(get props website)">
  <a &href="(get props website)">Website</a>
</li>`,
      props: {
        website: "",
      },
    }),
    "",
  );
});

Deno.test("component with visibleIf and undefined", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<li &visibleIf="(get props website)">
  <a &href="(get props website)">Website</a>
</li>`,
      props: {
        website: undefined,
      },
    }),
    "",
  );
});
