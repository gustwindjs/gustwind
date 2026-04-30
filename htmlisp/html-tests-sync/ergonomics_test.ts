import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync, raw, unwrapRawHtml } from "../mod.ts";

function renderButton(props: Record<string, unknown>) {
  return `<button>${String(props.children ?? "")}</button>`;
}

async function renderAsyncButton(props: Record<string, unknown>) {
  return `<button>${String(props.children ?? "")}</button>`;
}

test("escape by default escapes text children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="message"></div>`,
      props: { message: `<em>unsafe</em>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div>&lt;em&gt;unsafe&lt;/em&gt;</div>`,
  );
});

test("raw utility bypasses escaped children output", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(raw message)"></div>`,
      context: { message: `<em>safe</em>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div><em>safe</em></div>`,
  );
});

test("unwrapRawHtml unwraps raw wrappers and stringifies plain values", () => {
  assert.deepEqual(
    unwrapRawHtml(raw("<strong>safe</strong>")),
    "<strong>safe</strong>",
  );
  assert.deepEqual(unwrapRawHtml("plain"), "plain");
  assert.deepEqual(unwrapRawHtml(null), "");
});

test("rendered component children do not double escape", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<Button><span>foo & bar</span></Button>`,
      components: {
        Button: `<button &children="children"></button>`,
      },
      renderOptions: { escapeByDefault: true },
    }),
    `<button><span>foo &amp; bar</span></button>`,
  );
});

test("shorthand lookup resolves local before props before context", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<noop id="local-value"><div &children="id"></div><div &children="message"></div><div &children="post.slug"></div></noop>`,
      context: { message: "context-value" },
      props: { message: "props-value", post: { slug: "post-slug" } },
    }),
    `<div>local-value</div><div>props-value</div><div>post-slug</div>`,
  );
});

test("structured attrs merge with explicit attributes winning", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<button disabled &attrs="buttonAttrs" &title="title"></button>`,
      context: {
        buttonAttrs: { disabled: false, type: "button", title: "ignored" },
        title: `safe & sound`,
      },
      renderOptions: { escapeByDefault: true },
    }),
    `<button type="button" disabled title="safe &amp; sound"></button>`,
  );
});

test("fragment renders children without wrapper output", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<fragment><div>foo</div><div &children="(raw html)"></div></fragment>`,
      context: { html: `<span>bar</span>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div>foo</div><div><span>bar</span></div>`,
  );
});

test("sync renderer accepts function components", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<Button>demo</Button>`,
      components: {
        Button: renderButton,
      },
      renderOptions: { escapeByDefault: true },
    }),
    `<button>demo</button>`,
  );
});

test("sync renderer rejects async components", () => {
  assert.throws(
    () =>
      htmlispToHTMLSync({
        htmlInput: `<Button>demo</Button>`,
        components: {
          Button: renderAsyncButton,
        },
      }),
    Error,
    `returned a Promise in sync rendering`,
  );
});
