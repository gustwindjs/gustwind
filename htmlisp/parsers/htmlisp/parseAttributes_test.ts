import assert from "node:assert/strict";
import test from "node:test";
import { parseAttributes } from "./parseAttributes.ts";
import { characterGenerator } from "../characterGenerator.ts";

test(`attributes with "`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="test" title="bar"`)),
    { href: "test", title: "bar" },
  );
});

test(`attributes with " 2`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="test" title="bar">`)),
    { href: "test", title: "bar" },
  );
});

test(`self-closing attribute at the end`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="test" title>`)),
    { href: "test", title: true },
  );
});

test(`attribute with '`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href='test' title='foo'`)),
    { href: "test", title: "foo" },
  );
});

test(`attribute with 's and quotes`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href='te"st'`)),
    { href: 'te"st' },
  );
});

test(`attribute with backticks`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator("href=`test` title=`foo`")),
    { href: "test", title: "foo" },
  );
});

test(`attribute with backticks and quotes`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator('href=`te"st`')),
    { href: 'te"st' },
  );
});

test(`attribute without a value`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href title="foo"`)),
    { href: true, title: "foo" },
  );
});

test(`attribute without a value at the end`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`bar href/`)),
    { bar: true, href: true },
  );
});

test(`attribute without a value at the end 2`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href?`)),
    { href: true },
  );
});

test(`attribute at the end of a self-closing tag`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="foobar"/`)),
    { href: "foobar" },
  );
});

test(`attribute at the end of a tag`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="foobar">`)),
    { href: "foobar" },
  );
});

test(`tag end`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(` />`)),
    {},
  );
});

test(`tag end 2`, () => {
  assert.deepEqual(
    parseAttributes(characterGenerator(`href="test" title="foobar"></a>`)),
    { href: "test", title: "foobar" },
  );
});
