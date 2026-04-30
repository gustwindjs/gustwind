import assert from "node:assert/strict";
import test from "node:test";
import { getParseContent } from "./content.ts";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

test(`simple expression`, () => {
  const input = "foobar";

  assert.deepEqual(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(input),
    ),
    input,
  );
});

test(`simple comment`, () => {
  const input = "% foobar";

  assert.throws(
    () =>
      getParseContent<string>((parts) => parts.join(""))(
        characterGenerator(input),
      ),
    Error,
    `Skip`,
  );
});

test(`complex comment`, () => {
  const input = "% \noindent\makebox[\linewidth]{\rule{\textwidth}{1pt}}";

  assert.throws(
    () =>
      getParseContent<string>((parts) => parts.join(""))(
        characterGenerator(input),
      ),
    Error,
    `Skip`,
  );
});

test(`simple expression with a forced newline`, () => {
  const input = "foobar";

  assert.deepEqual(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(String.raw`${input}\\`),
    ),
    input,
  );
});

test(`paragraph`, () => {
  const input = `foobar
foobar

barfoo`;

  assert.deepEqual(
    getParseContent<string>((parts) => parts.join(""))(
      characterGenerator(input),
    ),
    `foobar
foobar`,
  );
});

test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assert.deepEqual(
    getParseContent<string>((parts) => parts.join(""), [
      getParseSingle({ url: (children) => children[0] }),
    ])(
      characterGenerator(input),
    ),
    "foobar https://bing.com barfoo",
  );
});

test(`url within paragraph with elements`, () => {
  const input = String.raw`foobar \url{https://bing.com} barfoo`;

  assert.deepEqual(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }), [getParseSingle({
      url: (children) => ({
        type: "a",
        attributes: { href: children[0] },
        children,
      }),
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

test(`footnote within paragraph with elements`, () => {
  const input = String.raw`foobar\footnote{https://bing.com} barfoo`;

  assert.deepEqual(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }), [getParseSingle({
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
    })])(
      characterGenerator(input),
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

test(`multiple footnotes`, () => {
  const input = String
    .raw`foobar\footnote{https://bing.com} barfoo\footnote{https://google.com}`;

  assert.deepEqual(
    getParseContent<Element>((children) => ({
      type: "p",
      attributes: {},
      children,
    }), [getParseSingle({
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
    })])(
      characterGenerator(input),
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
