import assert from "node:assert/strict";
import test from "node:test";
import { parseAttribute } from "./parseAttribute.ts";
import { characterGenerator } from "../characterGenerator.ts";

test(`attribute with "`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href="test" `)),
    ["href", "test"],
  );
});

test(`attribute with '`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`title='foo' `)),
    ["title", "foo"],
  );
});

test(`attribute with backticks`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator("title=`foo` ")),
    ["title", "foo"],
  );
});

test(`attribute singlequotes within backticks`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator("title=`f'o'o` ")),
    ["title", "f'o'o"],
  );
});

test(`attribute with single quotes in value`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`title="f'o'o" `)),
    ["title", "f'o'o"],
  );
});

test(`attribute with single backticks in value`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator('title="f`o`o" ')),
    ["title", "f`o`o"],
  );
});

test(`attribute without a value`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href `)),
    ["href", true],
  );
});

test(`attribute without a value at the end`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href/`)),
    ["href", true],
  );
});

test(`attribute without a value at the end 2`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href?`)),
    ["href", true],
  );
});

test(`attribute at the end of a self-closing tag`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href="foobar"/`)),
    ["href", "foobar"],
  );
});

test(`attribute at the end of a tag`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(`href="foobar">`)),
    ["href", "foobar"],
  );
});

test(`tag end`, () => {
  assert.deepEqual(
    parseAttribute(characterGenerator(` />`)),
    ["", true],
  );
});
