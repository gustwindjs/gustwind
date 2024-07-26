import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseContent } from "./content.ts";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(input),
    ),
    input,
  );
});

Deno.test(`simple expression with a forced newline`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(String.raw`${input}\\`),
    ),
    input,
  );
});

Deno.test(`paragraph`, () => {
  const input = `foobar
foobar

barfoo`;

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(input),
    ),
    `foobar
foobar`,
  );
});

Deno.test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assertEquals(
    getParseContent<string>((parts) => parts.join(""), [
      getParseSingle({ url: (s) => s }),
    ])(
      characterGenerator(input),
    ),
    "foobar https://bing.com barfoo",
  );
});

Deno.test(`url within paragraph with elements`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assertEquals(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }), [getParseSingle({
      url: (href) => ({ type: "a", attributes: { href }, children: [href] }),
    })])(
      characterGenerator(input),
    ),
    {
      type: "p",
      attributes: {},
      children: [
        "foobar ",
        {
          type: "a",
          attributes: {
            href: "https://bing.com",
          },
          children: ["https://bing.com"],
        },
        " barfoo",
      ],
    },
  );
});
