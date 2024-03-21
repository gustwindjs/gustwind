import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute } from "./parseAttribute.ts";
import { asGenerator } from "./utils.ts";

Deno.test(`parse attribute with "`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="test" `)()),
    ["href", "test"],
  );
});

Deno.test(`parse attribute with '`, () => {
  assertEquals(
    parseAttribute(asGenerator(`title='foo' `)()),
    ["title", "foo"],
  );
});

Deno.test(`parse attribute without a value`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href `)()),
    ["href", null],
  );
});

Deno.test(`parse attribute without a value at the end`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href/`)()),
    ["href", null],
  );
});

Deno.test(`parse attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href?`)()),
    ["href", null],
  );
});

Deno.test(`parse attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="foobar"/`)()),
    ["href", "foobar"],
  );
});

Deno.test(`parse attribute at the end of a tag`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="foobar">`)()),
    ["href", "foobar"],
  );
});

Deno.test(`parse tag end`, () => {
  assertEquals(
    parseAttribute(asGenerator(` />`)()),
    ["", null],
  );
});
