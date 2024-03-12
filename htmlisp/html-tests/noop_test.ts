import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with a type expression for noop type", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &type="(get context type)" />`,
      context: {
        type: "div",
      },
    }),
    "<div></div>",
  );
});

// TODO: Specify
Deno.test("&foreach with noop", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &foreach="(get context blogPosts)">
        <div class="inline">
          <SiteLink
            &children="(get props data.title)"
            &href="(urlJoin blog (get props data.slug))"
          />
        </div>
      </noop>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("component with noop", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<noop><div>foo</div></noop>` }),
    "",
  );
});

// TODO: Specify
Deno.test("component with noop and siblings", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop><div>foo</div><div>bar</div></noop>`,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("noop with children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop &children="(render (get props content))" />`,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("nested noops", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<noop
      &visibleIf="(get props children)"
      &type="(concat h (get props level))"
      &id="(getUniqueAnchorId (get props children))"
      &class="(get props class)"
    >
      <noop &children="(render (get props children))" />
      <a
        &visibleIf="(invert (get props hideAnchor))"
        class="ml-2 no-underline text-sm align-middle mask-text-gray hover:mask-text-black"
        &href="(concat # (get props id))"
        >🔗</a
      >
    </noop>`,
    }),
    "",
  );
});
