import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttributes } from "./parseAttributes.ts";
import { characterGenerator } from "./characterGenerator.ts";

Deno.test(`attributes with "`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="test" title="bar"`)),
    { href: "test", title: "bar" },
  );
});

Deno.test(`attributes with " 2`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="test" title="bar">`)),
    { href: "test", title: "bar" },
  );
});

Deno.test(`self-closing attribute at the end`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="test" title>`)),
    { href: "test", title: null },
  );
});

Deno.test(`attribute with '`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href='test' title='foo'`)),
    { href: "test", title: "foo" },
  );
});

Deno.test(`attribute with 's and quotes`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href='te"st'`)),
    { href: 'te"st' },
  );
});

Deno.test(`attribute with backticks`, () => {
  assertEquals(
    parseAttributes(characterGenerator("href=`test` title=`foo`")),
    { href: "test", title: "foo" },
  );
});

Deno.test(`attribute with backticks and quotes`, () => {
  assertEquals(
    parseAttributes(characterGenerator('href=`te"st`')),
    { href: 'te"st' },
  );
});

Deno.test(`attribute without a value`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href title="foo"`)),
    { href: null, title: "foo" },
  );
});

Deno.test(`attribute without a value at the end`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`bar href/`)),
    { bar: null, href: null },
  );
});

Deno.test(`attribute without a value at the end 2`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href?`)),
    { href: null },
  );
});

Deno.test(`attribute at the end of a self-closing tag`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="foobar"/`)),
    { href: "foobar" },
  );
});

Deno.test(`attribute at the end of a tag`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="foobar">`)),
    { href: "foobar" },
  );
});

Deno.test(`tag end`, () => {
  assertEquals(
    parseAttributes(characterGenerator(` />`)),
    {},
  );
});

Deno.test(`tag end 2`, () => {
  assertEquals(
    parseAttributes(characterGenerator(`href="test" title="foobar"></a>`)),
    { href: "test", title: "foobar" },
  );
});
