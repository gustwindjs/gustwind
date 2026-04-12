import { urlJoin } from "../../utilities/urlJoin.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("custom utilities", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<a &href="(urlJoin (get context href) (get context suffix))" />`,
      utilities: { urlJoin },
      context: { href: "foo", suffix: "bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

test("component utilities", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
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

test("utilities have access to context through this", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(test)" />`,
      utilities: {
        test: function (): string {
          // @ts-expect-error This is fine for now
          return this.context.demo;
        },
      },
      context: { demo: "bar" },
    }),
    `<div>bar</div>`,
  );
});

test("component utilities have access to context through this", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: "<Demo />",
      componentUtilities: {
        Demo: {
          test: function (): string {
            // @ts-expect-error This is fine for now
            return this.context.demo;
          },
        },
      },
      context: { demo: "bar" },
      components: {
        Demo: '<div &children="(test)" />',
      },
    }),
    `<div>bar</div>`,
  );
});

test("trigger _onRenderStart", async () => {
  const context = { test: 123 };
  let receivedContext;

  assert.deepEqual(
    await htmlispToHTMLSync({
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

  assert.deepEqual(receivedContext, context);
});

test("trigger _onRenderEnd", async () => {
  const context = { test: 123 };
  let receivedContext;

  assert.deepEqual(
    await htmlispToHTMLSync({
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

  assert.deepEqual(receivedContext, context);
});
