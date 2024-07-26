import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseContent } from "./content.ts";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent(id)(characterGenerator(input)),
    input,
  );
});

Deno.test(`simple expression with a forced newline`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent(id)(characterGenerator(String.raw`${input}\\`)),
    input,
  );
});

Deno.test(`paragraph`, () => {
  const input = `foobar
foobar

barfoo`;

  assertEquals(
    getParseContent(id)(characterGenerator(input)),
    `foobar
foobar`,
  );
});

Deno.test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assertEquals(
    getParseContent(id, [getParseSingle({ url: id })])(
      characterGenerator(input),
    ),
    "foobar https://bing.com barfoo",
  );
});

function id(s: string) {
  return s;
}
