import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

// TODO: Specify
Deno.test("props through slots as elements", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("props through slots as elements including normal props", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout title="demo">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("props through slots as elements including bound props", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout &title="(get props title)">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("children binding within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <span &children="(get props day)"></span>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("attribute binding within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div &title="(get props day)"></div>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});

// TODO: Specify
Deno.test("attribute binding to children within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div class="flex flex-col gap-8">
            <Workshops &children="(get context workshops)" />
          </div>
        </slot>
      </BaseLayout>
    `,
    }),
    "",
  );
});
