import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseParagraph } from "./parseParagraph.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`simple sentence`, () => {
  const sentence = "hello world";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`simple link`, () => {
  const sentence = String.raw`hello \url{https://google.com}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: ["hello ", {
        type: "a",
        attributes: { href: "https://google.com" },
        children: ["https://google.com"],
      }],
    }],
  );
});

Deno.test(`named link`, () => {
  const sentence = String.raw`hello \href{https://google.com}{Google}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: ["hello ", {
        type: "a",
        attributes: { href: "https://google.com" },
        children: ["Google"],
      }],
    }],
  );
});

Deno.test(`monospaced word`, () => {
  const sentence = String.raw`hello \texttt{world}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: ["hello ", {
        type: "code",
        attributes: {},
        children: ["world"],
      }],
    }],
  );
});

Deno.test(`bold word`, () => {
  const sentence = String.raw`hello \textbf{world}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: ["hello ", {
        type: "b",
        attributes: {},
        children: ["world"],
      }],
    }],
  );
});

Deno.test(`italic word`, () => {
  const sentence = String.raw`hello \textit{world}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "p",
      attributes: {},
      children: ["hello ", {
        type: "i",
        attributes: {},
        children: ["world"],
      }],
    }],
  );
});

Deno.test(`multiple sentences`, () => {
  const sentence = `hello
world`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence.split("\n\n").join("\n")],
    }],
  );
});

// TODO: Test a mixed case (i.e., a paragraph before verbatim)
Deno.test(`verbatim`, () => {
  const sentence = String.raw`\begin{verbatim}
hello world
\end{verbatim}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    [{
      type: "pre",
      attributes: {},
      children: ["hello world"],
    }],
  );
});
