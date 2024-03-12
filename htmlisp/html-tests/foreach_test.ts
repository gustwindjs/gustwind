import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

// TODO: Restore
Deno.test("&foreach with an array of objects", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &title="(get props data.title)" &children="(get props data.content)">
        </li>
      </ul>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
      utilities: { urlJoin },
    }),
    `<ul><li class="inline" title="foo">bar</li></ul>`,
  );
});

// TODO: Restore
Deno.test("&foreach with an array of objects and an attribute", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<ul &foreach="(get context blogPosts)" title="demo">
        <li class="inline" &title="(get props data.title)" &children="(get props data.content)">
        </li>
      </ul>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
      utilities: { urlJoin },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

// TODO: Restore
Deno.test("&foreach with an array of objects and an evaluated attribute", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<ul &foreach="(get context blogPosts)" &title="(get context demo)">
        <li class="inline" &title="(get props data.title)" &children="(get props data.content)">
        </li>
      </ul>
    `,
      context: {
        demo: "demo",
        blogPosts: [{ title: "foo", content: "bar" }],
      },
      utilities: { urlJoin },
    }),
    `<ul title="demo"><li class="inline" title="foo">bar</li></ul>`,
  );
});

// TODO: Restore
Deno.test("&foreach with an array of values", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &children="(get props data)">
        </li>
      </ul>
    `,
      context: {
        blogPosts: ["foo"],
      },
      utilities: { urlJoin },
    }),
    `<ul><li class="inline">foo</li></ul>`,
  );
});

// TODO: Restore
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
