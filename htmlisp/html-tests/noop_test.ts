import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with a type expression for noop type", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &type="(get context type)" />`,
      context: {
        type: "div",
      },
    }),
    "<div></div>",
  );
});

Deno.test("&foreach with noop", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &foreach="(get context blogPosts)">
        <div class="inline" &children="(get props data)"></div>
      </noop>,
    `,
      context: {
        blogPosts: ["foo", "bar", "baz"],
      },
    }),
    `<div class="inline">foo</div><div class="inline">bar</div><div class="inline">baz</div>`,
  );
});

Deno.test("component with noop", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<noop><div>foo</div></noop>` }),
    "<div>foo</div>",
  );
});

Deno.test("component with noop and siblings", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop><div>foo</div><div>bar</div></noop>`,
    }),
    "<div>foo</div><div>bar</div>",
  );
});

Deno.test("noop with children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &children="(get context content)" />`,
      context: {
        content: "foobar",
      },
    }),
    "foobar",
  );
});

Deno.test("nested noops", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop
      &visibleIf="(get context children)"
      &type="(concat h (get context level))"
      &class="(get context class)"
    >
      <noop &children="(get context children)" />
      <a
        &visibleIf="(invert (get context hideAnchor))"
        &href="(concat # (get props id))"
        >🔗</a
      >
    </noop>`,
      context: {
        children: "<div>foobar</div>",
        level: 2,
        class: "demo",
        hideAnchor: false,
        id: "foo",
      },
    }),
    `<div>foobar</div><a href="#foo">🔗</a>`,
  );
});
