import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("head integration", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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

test("full integration 1", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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
    <aside &children="(get props aside)"></aside>
    <main &children="(get props content)"></main>
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

test("full integration 2", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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
            <aside &children="(get props aside)"></aside>
            <main &children="(get props content)"></main>
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

test("full integration 3", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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
            <aside &children="(get props aside)"></aside>
            <main &children="(get props content)"></main>
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

test("full integration 4", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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
            <aside &children="(get props aside)"></aside>
            <main &children="(get props content)"></main>
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
