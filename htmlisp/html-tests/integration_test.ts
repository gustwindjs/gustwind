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

Deno.test("full integration 1", async () => {
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

Deno.test("full integration 2", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout content="<div>foobar</div>" />`,
      context: { meta: { language: "en", title: "demo" } },
      components: {
        BaseLayout: `<!DOCTYPE html>
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
        </html>`,
        MainNavigation: "<div>nav</div>",
        MainFooter: "<div>footer</div>",
      },
    }),
    `<!DOCTYPE html><html lang="en"><head><link rel="icon" href="demo"></link><link rel="preload" href="demo" as="style"></link><meta property="og:image" content="foobar/demo"></meta></head><body><div>nav</div><aside></aside><main><div>foobar</div></main><div>footer</div></body></html>`,
  );
});

Deno.test("full integration 3", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<BaseLayout><slot name="content"><div>foobar</div></slot></BaseLayout>`,
      context: { meta: { language: "en", title: "demo" } },
      components: {
        BaseLayout: `<!DOCTYPE html>
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
        </html>`,
        MainNavigation: "<div>nav</div>",
        MainFooter: "<div>footer</div>",
      },
    }),
    `<!DOCTYPE html><html lang="en"><head><link rel="icon" href="demo"></link><link rel="preload" href="demo" as="style"></link><meta property="og:image" content="foobar/demo"></meta></head><body><div>nav</div><aside></aside><main><div>foobar</div></main><div>footer</div></body></html>`,
  );
});

Deno.test("full integration 4", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
          <slot name="content">
            <div><span>foobar</span></div>
            <div>barfoo</div>
          </slot>
        </BaseLayout>`,
      context: { meta: { language: "en", title: "demo" } },
      components: {
        BaseLayout: `<!DOCTYPE html>
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
        </html>`,
        MainNavigation: "<div>nav</div>",
        MainFooter: "<div>footer</div>",
      },
    }),
    `<!DOCTYPE html><html lang="en"><head><link rel="icon" href="demo"></link><link rel="preload" href="demo" as="style"></link><meta property="og:image" content="foobar/demo"></meta></head><body><div>nav</div><aside></aside><main><div><span>foobar</span></div><div>barfoo</div></main><div>footer</div></body></html>`,
  );
});
