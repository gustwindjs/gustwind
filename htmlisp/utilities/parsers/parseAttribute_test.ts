import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute } from "./parseAttribute.ts";
import { asGenerator } from "./utils.ts";

Deno.test(`parse attribute with "`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="test" `)()),
    { href: "test" },
  );
});

Deno.test(`parse attribute with '`, () => {
  assertEquals(
    parseAttribute(asGenerator(`title='foo' `)()),
    { title: "foo" },
  );
});

Deno.test(`parse attribute without a value`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href `)()),
    { href: null },
  );
});

Deno.test(`parse attribute without a value at the end`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href/`)()),
    { href: null },
  );
});

Deno.test(`parse attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href?`)()),
    { href: null },
  );
});

// TODO: In this case it should return and also rollback the generator a step somehow
// Maybe it's a better idea to treat it as a closure instead since a method could be
// added
Deno.test(`parse attribute at the end`, () => {
  assertEquals(
    parseAttribute(asGenerator(`href="foobar"/`)()),
    { href: "foobar" },
  );
});
