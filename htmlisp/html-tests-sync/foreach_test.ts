import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

Deno.test("foreach with an array of objects", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &title="(get props title)" &children="(get props content)"></li>
      </ul>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("foreach with an array of objects and an attribute", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="(get context blogPosts)" title="demo">
        <li class="inline" &title="(get props title)" &children="(get props content)"></li>
      </ul>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("foreach with an array of objects and an evaluated attribute", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput:
        `<ul &foreach="(get context blogPosts)" &title="(get context demo)">
        <li class="inline" &title="(get props title)" &children="(get props content)"></li>
      </ul>
    `,
      context: {
        demo: "demo",
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("foreach with an array of values", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &children="(get props value)"></li>
      </ul>
    `,
      context: {
        blogPosts: ["foo"],
      },
    }),
    `<ul><li class="inline">foo</li></ul>`,
  );
});

Deno.test("foreach without a type", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<noop &foreach="(get context blogPosts)">
        <div class="inline" &children="(get props content)"></div>
      </noop>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<div class="inline">bar</div>`,
  );
});

Deno.test("foreach with nested children", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &foreach="(get context blogPosts)">
  <a
    &href="(get props slug)"
  >
    <div &children="(get props content)" />
  </a>
</div>
    `,
      context: {
        blogPosts: [{ slug: "foo", content: "bar" }],
      },
    }),
    `<div><a href="foo"><div>bar</div></a></div>`,
  );
});

Deno.test("foreach with nested children and a component", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &foreach="(get context blogPosts)">
  <a
    &href="(get props slug)"
  >
    <Card &title="(get props title)" />
  </a>
</div>
    `,
      context: {
        blogPosts: [{ slug: "foo", title: "bar" }],
      },
      components: {
        Card: `<div>
  <Heading &children="(get props title)" />
</div>`,
        Heading: `<h1 &children="(get props children)" />`,
      },
    }),
    `<div><a href="foo"><div><h1>bar</h1></div></a></div>`,
  );
});

Deno.test("foreach with access to component props", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<Posts prefix="demo" &items="(get context blogPosts)" />`,
      context: {
        blogPosts: [{ slug: "foo", title: "bar" }],
      },
      components: {
        Posts:
          `<ul &foreach="(get props items)"><li &title="(get props prefix)" &children="(get props slug)" /></ul>`,
      },
    }),
    `<ul><li title="demo">foo</li></ul>`,
  );
});
