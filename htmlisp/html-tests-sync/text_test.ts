import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

Deno.test("basic text", async () => {
  assertEquals(
    await htmlispToHTMLSync({ htmlInput: `foo` }),
    `foo`,
  );
});
