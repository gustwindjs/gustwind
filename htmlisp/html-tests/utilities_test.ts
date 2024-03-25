import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with custom utilities", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<a &href="(urlJoin (get context href) (get context suffix))" />`,
      utilities: { urlJoin },
      context: { href: "foo", suffix: "bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("element with component utilities", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<SiteLink &href="(urlJoin (get context href) (get context suffix))" />`,
      componentUtilities: { SiteLink: { urlJoin } },
      context: { href: "foo", suffix: "bar" },
      components: {
        SiteLink: '<a &href="(get props href)" />',
      },
    }),
    `<a href="foo/bar"></a>`,
  );
});
