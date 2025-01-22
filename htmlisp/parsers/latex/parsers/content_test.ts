import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseContent } from "./content.ts";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      { getCharacter: characterGenerator(input) },
    ),
    input,
  );
});

Deno.test(`simple comment`, () => {
  const input = "% foobar";

  assertThrows(
    () =>
      getParseContent<string>((parts) => parts.join(""))(
        { getCharacter: characterGenerator(input) },
      ),
    Error,
    `Skip`,
  );
});

Deno.test(`complex comment`, () => {
  const input = "% \noindent\makebox[\linewidth]{\rule{\textwidth}{1pt}}";

  assertThrows(
    () =>
      getParseContent<string>((parts) => parts.join(""))(
        { getCharacter: characterGenerator(input) },
      ),
    Error,
    `Skip`,
  );
});

Deno.test(`simple expression with a forced newline`, () => {
  const input = "foobar";

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      { getCharacter: characterGenerator(String.raw`${input}\\`) },
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
      { getCharacter: characterGenerator(input) },
    ),
    `foobar
foobar`,
  );
});

Deno.test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assertEquals(
    getParseContent<string>((parts) => parts.join(""))(
      {
        getCharacter: characterGenerator(input),
        parse: getParseSingle({ url: (children) => children[0] }),
      },
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
    }))(
      {
        getCharacter: characterGenerator(input),
        parse: getParseSingle({
          url: (children) => ({
            type: "a",
            attributes: { href: children[0] },
            children,
          }),
        }),
      },
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

Deno.test(`footnote within paragraph with elements`, () => {
  const input = String.raw`foobar\footnote{https://bing.com} barfoo`;

  assertEquals(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }))(
      {
        getCharacter: characterGenerator(input),
        parse: getParseSingle({
          footnote: (children, matchCounts) => ({
            type: "sup",
            attributes: { title: children[0] },
            children: [
              (matchCounts.footnote
                ? matchCounts.footnote.findIndex((e) => e === children[0]) + 1
                : 1)
                .toString(),
            ],
          }),
        }),
      },
    ),
    {
      type: "p",
      attributes: {},
      children: [
        "foobar",
        {
          type: "sup",
          attributes: {
            title: "https://bing.com",
          },
          children: ["1"],
        },
        " barfoo",
      ],
    },
  );
});

Deno.test(`multiple footnotes`, () => {
  const input = String
    .raw`foobar\footnote{https://bing.com} barfoo\footnote{https://google.com}`;

  assertEquals(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }))(
      {
        getCharacter: characterGenerator(input),
        parse: getParseSingle({
          footnote: (children, matchCounts) => ({
            type: "sup",
            attributes: { title: children[0] },
            children: [
              (matchCounts.footnote
                ? matchCounts.footnote.findIndex((e) => e === children[0]) + 1
                : 1)
                .toString(),
            ],
          }),
        }),
      },
    ),
    {
      type: "p",
      attributes: {},
      children: [
        "foobar",
        {
          type: "sup",
          attributes: {
            title: "https://bing.com",
          },
          children: ["1"],
        },
        " barfoo",
        {
          type: "sup",
          attributes: {
            title: "https://google.com",
          },
          children: ["2"],
        },
      ],
    },
  );
});

// TODO: Test a footnote with a url
