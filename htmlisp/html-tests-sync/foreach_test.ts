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

Deno.test("foreach alias with an array of objects", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<dl &foreach="readonlyFields as field">
        <dd &children="field.text"></dd>
      </dl>
    `,
      context: {
        readonlyFields: [{ text: "foo" }],
      },
    }),
    `<dl><dd>foo</dd></dl>`,
  );
});

Deno.test("foreach alias with an array of values", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="items as item">
        <li &children="item"></li>
      </ul>
    `,
      context: {
        items: ["foo"],
      },
    }),
    `<ul><li>foo</li></ul>`,
  );
});

Deno.test("foreach alias keeps direct field access compatibility", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="items as item">
        <li &title="item.slug" &children="slug"></li>
      </ul>
    `,
      context: {
        items: [{ slug: "foo" }],
      },
    }),
    `<ul><li title="foo">foo</li></ul>`,
  );
});

Deno.test("foreach with alias for object items", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<dl><noop &foreach="readonlyFields as field">
        <dd &children="field.text"></dd>
      </noop></dl>`,
      context: {
        readonlyFields: [{ text: "foo" }, { text: "bar" }],
      },
    }),
    `<dl><dd>foo</dd><dd>bar</dd></dl>`,
  );
});

Deno.test("foreach with alias for primitive items", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="blogPosts as post">
        <li &children="post"></li>
      </ul>`,
      context: {
        blogPosts: ["foo", "bar"],
      },
    }),
    `<ul><li>foo</li><li>bar</li></ul>`,
  );
});

Deno.test("foreach alias keeps value compatibility", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<ul &foreach="blogPosts as post">
        <li &title="value" &children="post"></li>
      </ul>`,
      context: {
        blogPosts: ["foo"],
      },
    }),
    `<ul><li title="foo">foo</li></ul>`,
  );
});
