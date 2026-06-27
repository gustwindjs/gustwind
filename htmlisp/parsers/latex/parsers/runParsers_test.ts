import assert from "node:assert/strict";
import test from "node:test";
import { characterGenerator } from "../../characterGenerator.ts";
import { type MatchCounts, runParsers } from "./runParsers.ts";

test("runParsers returns the first parser result", () => {
  const getCharacter = characterGenerator("abc");
  const matchCounts: MatchCounts = { cite: ["a"] };
  const firstParser = () => ({ match: "a", value: "first" });
  const secondParser = () => ({ match: "b", value: "second" });

  assert.deepEqual(
    runParsers(getCharacter, [firstParser, secondParser], matchCounts),
    { match: "a", value: "first" },
  );
});

test("runParsers wraps plain parser values", () => {
  const getCharacter = characterGenerator("abc");
  const parser = () => "plain";

  assert.deepEqual(
    runParsers(getCharacter, [parser as never]),
    { match: true, value: "plain" },
  );
});

test("runParsers wraps parser results without a truthy value", () => {
  const getCharacter = characterGenerator("abc");
  const parser = () => ({ match: "a", value: "" });

  assert.deepEqual(
    runParsers(getCharacter, [parser]),
    { match: true, value: { match: "a", value: "" } },
  );
});

test("runParsers resets the character index after non-matching parsers", () => {
  const getCharacter = characterGenerator("abc");
  const firstParser = () => {
    getCharacter.next();
    throw new Error("No matching expression was found");
  };
  const secondParser = () => ({
    match: getCharacter.next() as string,
    value: getCharacter.getIndex(),
  });

  assert.deepEqual(
    runParsers(getCharacter, [firstParser, secondParser]),
    { match: "a", value: 1 },
  );
});

test("runParsers skips parsers that throw Skip", () => {
  const getCharacter = characterGenerator("abc");
  const firstParser = () => {
    throw new Error("Skip");
  };
  const secondParser = () => ({ match: "b", value: "second" });

  assert.deepEqual(
    runParsers(getCharacter, [firstParser, secondParser]),
    { match: "b", value: "second" },
  );
});

test("runParsers propagates unexpected parser errors", () => {
  const getCharacter = characterGenerator("abc");
  const parser = () => {
    throw new Error("Unexpected");
  };

  assert.throws(
    () => runParsers(getCharacter, [parser]),
    { message: "Unexpected" },
  );
});

test("runParsers skips newlines and end of input", () => {
  const parser = () => ({ match: "a", value: "first" });

  assert.deepEqual(
    runParsers(characterGenerator("\nabc"), [parser]),
    { match: false },
  );
  assert.deepEqual(
    runParsers(characterGenerator(""), [parser]),
    { match: false },
  );
});
