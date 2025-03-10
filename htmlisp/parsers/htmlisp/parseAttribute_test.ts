import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute } from "./parseAttribute.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`attribute with "`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href="test" `)),
    ["href", "test"],
  );
});

Deno.test(`attribute with '`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`title='foo' `)),
    ["title", "foo"],
  );
});

Deno.test(`attribute with backticks`, () => {
  assertEquals(
    parseAttribute(characterGenerator("title=`foo` ")),
    ["title", "foo"],
  );
});

Deno.test(`attribute singlequotes within backticks`, () => {
  assertEquals(
    parseAttribute(characterGenerator("title=`f'o'o` ")),
    ["title", "f'o'o"],
  );
});

Deno.test(`attribute with single quotes in value`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`title="f'o'o" `)),
    ["title", "f'o'o"],
  );
});

Deno.test(`attribute with single backticks in value`, () => {
  assertEquals(
    parseAttribute(characterGenerator('title="f`o`o" ')),
    ["title", "f`o`o"],
  );
});

Deno.test(`attribute without a value`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href `)),
    ["href", true],
  );
});

Deno.test(`attribute without a value at the end`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href/`)),
    ["href", true],
  );
});

Deno.test(`attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href?`)),
    ["href", true],
  );
});

Deno.test(`attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href="foobar"/`)),
    ["href", "foobar"],
  );
});

Deno.test(`attribute at the end of a tag`, () => {
  assertEquals(
    parseAttribute(characterGenerator(`href="foobar">`)),
    ["href", "foobar"],
  );
});

Deno.test(`tag end`, () => {
  assertEquals(
    parseAttribute(characterGenerator(` />`)),
    ["", true],
  );
});
