import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttributes } from "./parseAttributes.ts";
import { asGenerator } from "./utils.ts";

Deno.test(`attributes with "`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="bar"`)()),
    { href: "test", title: "bar" },
  );
});

Deno.test(`attributes with " 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="bar">`)()),
    { href: "test", title: "bar" },
  );
});

Deno.test(`self-closing attribute at the end`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title>`)()),
    { href: "test", title: null },
  );
});

Deno.test(`attribute with '`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href='test' title='foo'`)()),
    { href: "test", title: "foo" },
  );
});

Deno.test(`attribute with 's and quotes`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href='te"st'`)()),
    { href: 'te"st' },
  );
});

Deno.test(`attribute with backticks`, () => {
  assertEquals(
    parseAttributes(asGenerator("href=`test` title=`foo`")()),
    { href: "test", title: "foo" },
  );
});

Deno.test(`attribute with backticks and quotes`, () => {
  assertEquals(
    parseAttributes(asGenerator('href=`te"st`')()),
    { href: 'te"st' },
  );
});

Deno.test(`attribute without a value`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href title="foo"`)()),
    { href: null, title: "foo" },
  );
});

Deno.test(`attribute without a value at the end`, () => {
  assertEquals(
    parseAttributes(asGenerator(`bar href/`)()),
    { bar: null, href: null },
  );
});

Deno.test(`attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href?`)()),
    { href: null },
  );
});

Deno.test(`attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="foobar"/`)()),
    { href: "foobar" },
  );
});

Deno.test(`attribute at the end of a tag`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="foobar">`)()),
    { href: "foobar" },
  );
});

Deno.test(`tag end`, () => {
  assertEquals(
    parseAttributes(asGenerator(` />`)()),
    {},
  );
});

Deno.test(`tag end 2`, () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="foobar"></a>`)()),
    { href: "test", title: "foobar" },
  );
});
