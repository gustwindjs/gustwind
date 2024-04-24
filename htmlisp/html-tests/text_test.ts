import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic text", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `foo` }),
    `foo`,
  );
});
