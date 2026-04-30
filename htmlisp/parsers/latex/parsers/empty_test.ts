import assert from "node:assert/strict";
import test from "node:test";
import { parseEmpty } from "./empty.ts";
import { characterGenerator } from "../../characterGenerator.ts";

test(`simple expression`, () => {
  const input = "foobar";
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assert.deepEqual(getCharacter.get(), "f");
});

test(`simple expression with empty in the beginning`, () => {
  const input = "   foobar";
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assert.deepEqual(getCharacter.get(), "f");
});

test(`simple expression with newline`, () => {
  const input = `

foobar`;
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assert.deepEqual(getCharacter.get(), "f");
});

test(`simple expression with newline and whitespace`, () => {
  const input = `

  foobar`;
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assert.deepEqual(getCharacter.get(), "f");
});

// TODO: Test checkRule parameter
