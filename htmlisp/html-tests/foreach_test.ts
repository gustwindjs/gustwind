import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

// TODO: Restore
Deno.test("&foreach", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &title="(get context title)" &children="(get context content)">
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
