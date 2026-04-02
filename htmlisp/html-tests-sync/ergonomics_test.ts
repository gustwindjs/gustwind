import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

function renderButton(props: Record<string, unknown>) {
  return `<button>${String(props.children ?? "")}</button>`;
}

async function renderAsyncButton(props: Record<string, unknown>) {
  return `<button>${String(props.children ?? "")}</button>`;
}

Deno.test("escape by default escapes text children", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="message"></div>`,
      props: { message: `<em>unsafe</em>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div>&lt;em&gt;unsafe&lt;/em&gt;</div>`,
  );
});

Deno.test("raw utility bypasses escaped children output", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(raw message)"></div>`,
      context: { message: `<em>safe</em>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div><em>safe</em></div>`,
  );
});

Deno.test("rendered component children do not double escape", async () => {
  assertEquals(
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

Deno.test("shorthand lookup resolves local before props before context", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput:
        `<noop id="local-value"><div &children="id"></div><div &children="message"></div><div &children="post.slug"></div></noop>`,
      context: { message: "context-value" },
      props: { message: "props-value", post: { slug: "post-slug" } },
    }),
    `<div>local-value</div><div>props-value</div><div>post-slug</div>`,
  );
});

Deno.test("structured attrs merge with explicit attributes winning", async () => {
  assertEquals(
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

Deno.test("fragment renders children without wrapper output", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput:
        `<fragment><div>foo</div><div &children="(raw html)"></div></fragment>`,
      context: { html: `<span>bar</span>` },
      renderOptions: { escapeByDefault: true },
    }),
    `<div>foo</div><div><span>bar</span></div>`,
  );
});

Deno.test("sync renderer accepts function components", async () => {
  assertEquals(
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

Deno.test("sync renderer rejects async components", () => {
  assertThrows(
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
