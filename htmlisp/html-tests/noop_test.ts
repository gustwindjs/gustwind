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

Deno.test("element children with noop", async () => {
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
        &visibleIf="(get context showAnchor)"
        &href="(concat # (get context id))"
        >🔗</a
      >
    </noop>`,
      context: {
        children: "<div>foobar</div>",
        level: 2,
        class: "demo",
        showAnchor: true,
        id: "foo",
      },
    }),
    `<h2 class="demo"><div>foobar</div><a href="#foo">🔗</a></h2>`,
  );
});
