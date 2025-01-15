import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseLatex } from "../parseLatex.ts";

Deno.test(`expression with a comment`, () => {
  const input = `foobar

% comment`;

  assertEquals(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test(`comment with an expression`, () => {
  const input = `% comment

foobar`;

  assertEquals(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test(`complex comment with an expression`, () => {
  const input = `% \noindent\makebox[\linewidth]{\rule{\textwidth}{1pt}}

foobar`;

  assertEquals(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test(`multiple comments with an expression`, () => {
  const input =
    `% This writing guide has been tailored specifically for my students. It contains personal views, and you should not consider it to be the final word on the topic. Rather, I have captured my experience in this booklet after publishing a dozen scientific papers. In short, it is the kind of information that would have been useful for me to have before I started my efforts toward a doctorate.

% I want to give my special thanks to my students (too many to mention) for inspiring the work and to akx, tpr, Maurice Forget, and Eugene Woo for constructive feedback.

% \noindent\makebox[\linewidth]{\rule{\textwidth}{1pt}}

According to \citet{openWhatFirst}, the first scientific journal was published in...
More content goes here.`;

  assertEquals(
    parseLatex(input, {}),
    [{
      type: "p",
      attributes: {},
      children: [
        "According to \citet{openWhatFirst}, the first scientific journal was published in...\nMore content goes here.",
      ],
    }],
  );
});
