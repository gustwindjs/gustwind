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

Deno.test("should not override element type for non-noop", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<script &type="(get props type)" &src="(get props src)"></script>`,
      props: {
        type: "module",
        src: "demo.js",
      },
    }),
    `<script type="module" src="demo.js"></script>`,
  );
});

// TODO: There's an interesting corner case - what if you want to
// use <noop &type="(get props type)" ...> and set both element
// type and attribute named type simultaneously. Maybe some other
// way (different naming?) is needed to cover this although it
// feels like a niche case that is safe to ignore for now.
