import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute } from "./parseAttribute.ts";
import { asGenerator } from "./utils.ts";

Deno.test(`attribute with "`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="test" `)()),
    ["href", "test"],
  );
});

Deno.test(`attribute with '`, () => {
  assertEquals(
    parseAttribute(asGenerator(`title='foo' `)()),
    ["title", "foo"],
  );
});

Deno.test(`attribute without a value`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href `)()),
    ["href", null],
  );
});

Deno.test(`attribute without a value at the end`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href/`)()),
    ["href", null],
  );
});

Deno.test(`attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href?`)()),
    ["href", null],
  );
});

Deno.test(`attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="foobar"/`)()),
    ["href", "foobar"],
  );
});

Deno.test(`attribute at the end of a tag`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="foobar">`)()),
    ["href", "foobar"],
  );
});

Deno.test(`tag end`, () => {
  assertEquals(
    parseAttribute(asGenerator(` />`)()),
    ["", null],
  );
});
