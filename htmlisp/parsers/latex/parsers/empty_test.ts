import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseEmpty } from "./empty.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assertEquals(getCharacter.get(), "f");
});

Deno.test(`simple expression with empty in the beginning`, () => {
  const input = "   foobar";
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assertEquals(getCharacter.get(), "f");
});

Deno.test(`simple expression with newline`, () => {
  const input = `

foobar`;
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assertEquals(getCharacter.get(), "f");
});

Deno.test(`simple expression with newline and whitespace`, () => {
  const input = `

  foobar`;
  const getCharacter = characterGenerator(input);

  parseEmpty(getCharacter);

  assertEquals(getCharacter.get(), "f");
});

// TODO: Test checkRule parameter
