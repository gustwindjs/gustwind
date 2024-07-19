import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseParagraph } from "./parseParagraph.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`simple sentence`, () => {
  const sentence = "hello world";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    sentence,
  );
});
