import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("Foreach with an array of objects", async () => {
  assertEquals(
    // Due to recursion order in htm (leaf first), there is a workaround for bindings in the
    // form of # that allows to address values within props.
    await htmlispToHTML({
      htmlInput: `<Foreach type="ul" &values="(get context blogPosts)">
        <li class="inline" #title="(get props title)" #children="(get props content)"></li>
      </Foreach>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("Foreach with an array of objects and an attribute", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<Foreach type="ul" &values="(get context blogPosts)" title="demo">
        <li class="inline" #title="(get props data.title)" #children="(get props data.content)"></li>
      </Foreach>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("Foreach with an array of objects and an evaluated attribute", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<Foreach type="ul" &values="(get context blogPosts)" &title="(get context demo)">
        <li class="inline" #title="(get props data.title)" #children="(get props data.content)"></li>
      </Foreach>
    `,
      context: {
        demo: "demo",
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

Deno.test("Foreach with an array of values", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Foreach type="ul" &values="(get context blogPosts)">
        <li class="inline" #children="(get props data)"></li>
      </Foreach>
    `,
      context: {
        blogPosts: ["foo"],
      },
    }),
    `<ul><li class="inline">foo</li></ul>`,
  );
});

Deno.test("Foreach without a type", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<Foreach &values="(get context blogPosts)">
        <div class="inline" #children="(get props content)"></div>
      </Foreach>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
    }),
    `<div class="inline">bar</div>`,
  );
});
