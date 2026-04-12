import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("element with a visibleIf enabled", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: false,
      },
    }),
    "",
  );
});

test("element with a visibleIf disabled", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: true,
      },
    }),
    "<div>foo</div>",
  );
});

test("element with a complex visibleIf", async () => {
  assert.deepEqual(
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

test("component with visibleIf and boolean", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("component with visibleIf and string", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("component with visibleIf and undefined", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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
