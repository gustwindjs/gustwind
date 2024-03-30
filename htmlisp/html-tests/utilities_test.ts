import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("custom utilities", async () => {
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

Deno.test("component utilities", async () => {
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

Deno.test("utilities have access to context through this", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(test)" />`,
      utilities: {
        test: function () {
          return this.context.demo;
        },
      },
      context: { demo: "bar" },
    }),
    `<div>bar</div>`,
  );
});

Deno.test("component utilities have access to context through this", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: "<Demo />",
      componentUtilities: {
        Demo: {
          test: function () {
            return this.context.demo;
          },
        },
      },
      context: { demo: "bar" },
      components: {
        Demo: '<div &children="(test)" />`',
      },
    }),
    `<div>bar</div>`,
  );
});

Deno.test("trigger _onRenderStart", async () => {
  const context = { test: 123 };
  let receivedContext;

  assertEquals(
    await htmlispToHTML({
      htmlInput: '<div &children="(hello)" />',
      context,
      utilities: {
        _onRenderStart: (ctx) => {
          receivedContext = ctx;
        },
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );

  assertEquals(receivedContext, context);
});

Deno.test("trigger _onRenderEnd", async () => {
  const context = { test: 123 };
  let receivedContext;

  assertEquals(
    await htmlispToHTML({
      htmlInput: '<div &children="(hello)" />',
      context,
      utilities: {
        _onRenderEnd: (ctx) => {
          receivedContext = ctx;
        },
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );

  assertEquals(receivedContext, context);
});
