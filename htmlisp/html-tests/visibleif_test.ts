import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with a visibleIf enabled", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: false,
      },
    }),
    "",
  );
});

Deno.test("element with a visibleIf disabled", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: true,
      },
    }),
    "<div>foo</div>",
  );
});

Deno.test("element with a complex visibleIf", () => {
  assertEquals(
    htmlispToHTML({
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

Deno.test("component with visibleIf and boolean", () => {
  assertEquals(
    htmlispToHTML({
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

Deno.test("component with visibleIf and string", () => {
  assertEquals(
    htmlispToHTML({
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

Deno.test("component with visibleIf and undefined", () => {
  assertEquals(
    htmlispToHTML({
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
