import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("foreach with an array of objects", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with an array of objects and an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with an array of objects and an evaluated attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with an array of values", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach without a type", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with nested children", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with nested children and a component", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with access to component props", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach alias with an array of objects", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach alias with an array of values", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach alias keeps direct field access compatibility", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with alias for object items", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach with alias for primitive items", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("foreach alias keeps value compatibility", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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
