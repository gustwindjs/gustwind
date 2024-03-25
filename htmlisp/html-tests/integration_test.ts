import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("head integration", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<!DOCTYPE html>
<html &lang="(get context meta.language)">
  <head>
    <link
      rel="icon"
      href="demo"
    />
    <link
      rel="preload"
      href="demo"
      as="style"
    />
    <meta
      property="og:image"
      &content="(concat
        foobar/
        (get context meta.title)
      )"
    />
  </head>
</html>
`,
      context: { meta: { language: "en", title: "demo" } },
    }),
    `<!DOCTYPE html><html lang="en"><head><link rel="icon" href="demo"></link><link rel="preload" href="demo" as="style"></link><meta property="og:image" content="foobar/demo"></meta></head></html>`,
  );
});

Deno.test("full integration", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<!DOCTYPE html>
<html &lang="(get context meta.language)">
  <head>
    <link
      rel="icon"
      href="demo"
    />
    <link
      rel="preload"
      href="demo"
      as="style"
    />
    <meta
      property="og:image"
      &content="(concat
        foobar/
        (get context meta.title)
      )"
    />
  </head>
  <body>
    <MainNavigation />
    <aside &children="(render (get props aside))"></aside>
    <main &children="(render (get props content))"></main>
    <MainFooter />
  </body>
</html>
`,
      context: { meta: { language: "en", title: "demo" } },
      components: {
        MainNavigation: "<div>nav</div>",
        MainFooter: "<div>footer</div>",
      },
      props: {
        content: "<div>foobar</div>",
      },
    }),
    `<!DOCTYPE html><html lang="en"><head><link rel="icon" href="demo"></link><link rel="preload" href="demo" as="style"></link><meta property="og:image" content="foobar/demo"></meta></head><body><div>nav</div><aside></aside><main><div>foobar</div></main><div>footer</div></body></html>`,
  );
});
