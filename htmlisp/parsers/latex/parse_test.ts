import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parse } from "./parse.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`id expression`, () => {
  const input = "foobar";

  assertEquals(
    parse(characterGenerator(input)),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});

Deno.test(`bold`, () => {
  const input = String.raw`\textbf{foobar}`;

  assertEquals(
    parse(characterGenerator(input)),
    [{ type: "b", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test(`url`, () => {
  const input = String.raw`\url{https://google.com}`;

  assertEquals(
    parse(characterGenerator(input)),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["https://google.com"],
    }],
  );
});

// TODO: Test other singles - these tests could be even generated from the definition
