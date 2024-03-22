import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttributes } from "./parseAttributes.ts";
import { asGenerator } from "./utils.ts";

Deno.test(`parse attributes with "`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="bar"`)()),
    { href: "test", title: "bar" },
  );
});

Deno.test(`parse attributes with " 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="bar">`)()),
    { href: "test", title: "bar" },
  );
});

Deno.test(`parse attribute with '`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href='test' title='foo'`)()),
    { href: "test", title: "foo" },
  );
});

Deno.test(`parse attribute without a value`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href title="foo"`)()),
    { href: null, title: "foo" },
  );
});

Deno.test(`parse attribute without a value at the end`, () => {
  assertEquals(
    parseAttributes(asGenerator(`bar href/`)()),
    { bar: null, href: null },
  );
});

Deno.test(`parse attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href?`)()),
    { href: null },
  );
});

Deno.test(`parse attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="foobar"/`)()),
    { href: "foobar" },
  );
});

Deno.test(`parse attribute at the end of a tag`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="foobar">`)()),
    { href: "foobar" },
  );
});

Deno.test(`parse tag end`, () => {
  assertEquals(
    parseAttributes(asGenerator(` />`)()),
    {},
  );
});

Deno.test(`parse tag end 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="foobar"></a>`)()),
    { href: "test", title: "foobar" },
  );
});
