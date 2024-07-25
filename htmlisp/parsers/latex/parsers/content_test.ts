import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseContent } from "./content.ts";
import { characterGenerator } from "../../characterGenerator.ts";

// TODO: Add a curry syntax to allow customization of output

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    parseContent(characterGenerator(input)),
    input,
  );
});

Deno.test(`simple expression with a forced newline`, () => {
  const input = "foobar";

  assertEquals(
    parseContent(characterGenerator(String.raw`${input}\\`)),
    input,
  );
});

Deno.test(`paragraph`, () => {
  const input = `foobar
foobar

barfoo`;

  assertEquals(
    parseContent(characterGenerator(input)),
    `foobar
foobar`,
  );
});
