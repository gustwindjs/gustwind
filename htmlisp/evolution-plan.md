# HTMLisp Evolution Plan

This note converts the earlier improvement ideas into an implementation plan grounded in the current HTMLisp codebase.

Status as of the current implementation:

- phase 0 is complete
- phase 1 is complete
- phase 2 is complete
- phase 3 is complete for loop alias syntax evaluation
- a typing gate now exists for the HTMLisp test suite
- block/interpolation syntax is deferred and not part of this plan's completion criteria

The target is still the same:

- keep HTMLisp server-rendered
- preserve backward compatibility where practical
- reduce template ceremony in real project code
- avoid turning HTMLisp into a framework or compiler project

The main question is not whether the ideas are desirable. The main question is whether they fit the current parser, evaluator, and renderer shape without causing a rewrite. This plan assumes changes should be incremental and shippable.

## Current Implementation Constraints

The current HTMLisp implementation has a few properties that strongly affect what is realistic:

- expressions exist only in `&...` attributes
- expression evaluation is utility-based and `eval` free
- `noop` currently serves multiple roles:
  - fragment-like output suppression
  - local binding carrier
  - dynamic tag replacement through `&type`
- components can now be registered as strings or functions
- async and sync rendering paths are maintained in parallel

That means:

- expression sugar is cheap if it stays inside existing `&...` attributes
- renderer changes are cheap if they reuse the current AST shape
- brand new surface syntax is expensive if it bypasses HTML tag parsing
- every non-trivial feature must be implemented twice unless common logic is extracted first

## Concrete Decision Summary

The following changes are realistic and worth implementing:

1. escape by default with explicit raw output
2. shorthand scoped variable access inside existing `&...` attributes
3. structured attributes through `&attrs`
4. a first-class fragment alias for insertion and composition
5. typed function components as an additive component API

The following changes are realistic later, but should not be phase 1 work:

1. loop aliases such as `readonlyFields as field`
2. dedicated raw insertion syntax beyond a fragment alias
3. block forms such as `{@if}` and `{@for}`
4. interpolation syntax such as `{value}` in text nodes or attributes

## Implemented Baseline

The following items are already implemented:

1. `RawHtml` support through `raw(...)`
2. `renderOptions.escapeByDefault`
3. shorthand scoped lookup inside existing `&...` attributes
4. structured attributes via `&attrs`
5. `fragment` as a first-class wrapperless composition tag
6. function components with explicit async/sync behavior
7. loop alias syntax through `&foreach="items as item"`
8. focused ergonomics tests for new behavior
9. a typing gate through `deno task check:types`

The rest of this document describes what shipped, what was intentionally deferred, and why this plan can now be considered complete.

## Recommended Implementation Order

### Phase 0: Refactor For Safe Change

This phase is internal only. It reduces duplication before adding behavior.

Status: complete

#### Goals

- extract shared scope resolution helpers
- extract shared escaping and raw-value helpers
- extract shared attribute normalization logic
- keep async and sync renderers behaviorally aligned

#### Why This Phase Exists

Today the same concepts are duplicated across:

- `htmlisp/utilities/parseExpressions.ts`
- `htmlisp/utilities/parseExpressionsSync.ts`
- `htmlisp/utilities/astToHTML.ts`
- `htmlisp/utilities/astToHTMLSync.ts`

If feature work starts without reducing duplication, each later step becomes slower and easier to break.

#### Deliverables

- a shared helper for resolving identifiers from `{ local, props, context }`
- a shared helper for normalizing renderable values:
  - plain text
  - raw HTML
  - attribute maps
- a shared helper for serializing attributes consistently

#### Exit Criteria

- no behavior change
- existing HTMLisp tests remain green
- new helpers are used by both async and sync paths

Outcome:

- shared runtime helpers now handle raw values, escaping, and scoped resolution
- async and sync renderers use the same compatibility model

### Phase 1: Safer Output And Less Ceremony

This is the highest-value phase. It should be the first user-visible release.

Status: complete

#### 1. Escape By Default

##### Decision

Normal string output should be escaped by default. Trusted HTML should require an explicit wrapper.

##### Proposed API

Add a raw HTML wrapper and utility:

```ts
const html = raw("<strong>safe</strong>");
```

Use inside templates through existing expression slots:

```html
<div &children="(raw summaryHtml)"></div>
```

##### Implementation Notes

- add a branded `RawHtml` type
- add a `raw(...)` utility
- add a renderer option such as `escapeByDefault?: boolean`
- preserve current behavior by default for the first release
- enable the new mode in this repo only after tests are in place

##### Important Constraint

Rendered child HTML is currently passed through component props as plain strings. That means escape-by-default cannot simply escape all strings everywhere. It must distinguish:

- text values that originated from data
- trusted rendered markup produced by HTMLisp itself
- explicit raw HTML values from `raw(...)`

##### Deliverables

- `RawHtml` type and constructor
- renderer-level escaping for text content and attribute values
- raw passthrough for trusted child HTML
- compatibility option for old behavior

Outcome:

- shipped as `RawHtml`, `raw(...)`, and `renderOptions.escapeByDefault`
- renderer-produced child markup is passed through as trusted raw output where needed
- compatibility mode remains the default unless escaped output is enabled explicitly

#### 2. Scoped Variable Shorthand

##### Decision

Add shorthand variable lookup only inside existing `&...` expression attributes.

##### Supported Syntax In Phase 1

```html
<p &class="subtleText" &children="message"></p>
<a &href="post.slug"></a>
<div &visibleIf="topicVisible"></div>
```

##### Scope Resolution Order

Use:

1. `local`
2. `props`
3. `context`

That makes template intent predictable and keeps current explicit `(get props ...)` behavior as the fallback.

##### Implementation Notes

- keep existing Lisp-form expressions fully supported
- treat bare identifiers and dotted paths as shorthand expressions
- do not add free-form JavaScript evaluation
- do not add alias syntax yet

##### Deliverables

- parser support for bare identifier and dotted path expression forms
- shared scope resolver helper
- tests for precedence, nested keys, and compatibility with `(get ...)`

Outcome:

- shipped for `&...` bindings through bare identifiers and dotted paths
- scope resolution order is `local -> props -> context`
- Lisp-style forms remain valid

#### 3. Structured Attributes With `&attrs`

##### Decision

Support structured attribute maps before adding spread syntax.

##### Supported Syntax

```html
<button
  &type="type"
  &class="className"
  &attrs="extraAttributes"
  &children="label"
></button>
```

##### Attribute Map Semantics

- `string` -> rendered as `key="value"` after escaping
- `true` -> rendered as a boolean attribute
- `false`, `null`, `undefined` -> omitted

##### Precedence

Use explicit attributes first, `&attrs` second only for missing keys.

That avoids accidental overrides in component helpers.

##### Deliverables

- `attrs` handling in attribute serialization
- support for boolean and optional attributes
- tests for merge order and omission rules

Outcome:

- shipped as `&attrs`
- explicit attributes override values coming from `&attrs`
- boolean and omitted-value behavior is covered by tests

#### Exit Criteria For Phase 1

- HTMLisp can run in compatibility mode and in escaped-output mode
- common `(get props ...)` usage can be rewritten to shorthand
- button-like helpers can stop parsing string attributes manually

Outcome:

- all exit criteria are met

### Phase 2: Composition Improvements

This phase improves template readability without parser-heavy work.

Status: complete

#### 4. First-Class Fragment Alias

##### Decision

Add a dedicated fragment alias, but keep `noop`.

##### Supported Syntax

```html
<fragment &children="submitButton"></fragment>
```

and:

```html
<fragment>
  <Button />
  <Button />
</fragment>
```

##### Why Alias Instead Of Replacement

`noop` is overloaded today. It is not only a fragment. It also carries local bindings and dynamic type logic. Replacing it outright would make migration and behavior harder to reason about.

##### Deliverables

- `fragment` tag with output behavior equivalent to `noop` without `&type`
- docs that reserve `noop` for advanced cases and prefer `fragment` for plain composition

Outcome:

- `fragment` is implemented
- README now documents `fragment` as the default composition primitive and `noop` as the advanced escape hatch

#### 5. Typed Function Components

##### Decision

Expand component registration so components may be strings or functions.

##### Proposed Shape

```ts
type HTMLispComponent<Props> =
  | string
  | ((props: Props) => string)
  | ((props: Props) => Promise<string>);
```

The exact sync/async split should stay explicit:

- sync renderer accepts sync component functions only
- async renderer may accept sync or async component functions

##### Constraints

- keep string component registration working
- preserve component-local utilities support
- do not silently allow async behavior in sync rendering

##### Deliverables

- widened `Components` typing
- runtime support in async and sync renderers
- tests for string components, sync function components, and async function components

Outcome:

- components now accept strings or functions
- async component functions are supported in the async renderer
- sync renderer rejects async component functions explicitly

#### Exit Criteria For Phase 2

- component-heavy templates can use `fragment` instead of child-insertion `noop`
- TypeScript-authored components no longer require large string dictionaries in all cases

Outcome:

- both exit criteria are met

### Phase 3: Optional Syntax Expansion

This phase should happen only if phase 1 and phase 2 still leave the templates too noisy.

Status: complete as an evaluation phase

#### 6. Loop Alias Syntax

##### Candidate Syntax

```html
<noop &foreach="readonlyFields as field">
  <dd &children="field.text"></dd>
</noop>
```

##### Notes

- this is still realistic because it extends an existing directive
- it is less invasive than block syntax
- it should follow shorthand scope lookup, not precede it

Outcome:

- shipped as `&foreach="items as item"`
- the alias points to the full current item
- direct field access and `value` remain available for compatibility

#### 7. Block Conditionals And Loops

##### Candidate Syntax

```html
{@if topicVisible}
  <p &class="topicTextClass" &children="topic"></p>
{/if}

{@for field in readonlyFields}
  <dd &children="field.text"></dd>
{/for}
```

##### Why Deferred

The current parser is HTML-tag oriented. Block directives would require parser work that does not fit naturally into the existing tag/attribute model.

This feature is realistic, but it is a parser project, not a small ergonomic patch.

Current decision:

- defer to a separate future design note or RFC if real template pain justifies parser work later
- do not treat this as unfinished work for the current evolution plan

#### 8. Interpolation Syntax

##### Candidate Syntax

```html
<p>{message}</p>
<div>{raw(summaryHtml)}</div>
```

##### Why Deferred

Interpolation touches text-node parsing, escaping rules, raw handling, and editor support at the same time. It should only happen after escape semantics are stable.

Current decision:

- defer to a separate future design note or RFC if the shorthand and fragment improvements still prove insufficient
- do not treat this as unfinished work for the current evolution plan

## Files Likely To Change

### Core Runtime

- `htmlisp/types.ts`
- `htmlisp/defaultUtilities.ts`
- `htmlisp/htmlispToHTML.ts`
- `htmlisp/htmlispToHTMLSync.ts`
- `htmlisp/utilities/parseExpression.ts`
- `htmlisp/utilities/parseExpressions.ts`
- `htmlisp/utilities/parseExpressionsSync.ts`
- `htmlisp/utilities/applyUtility.ts`
- `htmlisp/utilities/applyUtilitySync.ts`
- `htmlisp/utilities/astToHTML.ts`
- `htmlisp/utilities/astToHTMLSync.ts`
- `htmlisp/utilities/renderElement.ts`
- `htmlisp/utilities/getAttributeBindings.ts`
- `htmlisp/utilities/runtime.ts`
- `htmlisp/utilities/parseBoundExpression.ts`

### Parser Work For Later Phases

- `htmlisp/parsers/htmlisp/parseTag.ts`
- `htmlisp/parsers/htmlisp/parseAttribute.ts`
- possibly new parser helpers for block directives

### Documentation And Tooling

- `htmlisp/README.md`
- local editor support under `editor-support/vscode-htmlisp/`

## Proposed Backlog

### Milestone A: Compatibility Infrastructure

Status: complete

1. Introduce shared render-value helpers and remove duplicated normalization logic.
2. Add `HtmlispRenderOptions` with `escapeByDefault`.
3. Thread render options through sync and async entry points.

### Milestone B: Safe Output

Status: complete

1. Add `RawHtml` type and `raw(...)` utility.
2. Escape text-node values by default when the option is enabled.
3. Escape attribute values consistently.
4. Preserve trusted rendered child markup without double escaping.
5. Add compatibility tests for old mode and new mode.

### Milestone C: Scoped Shorthand

Status: complete

1. Extend expression parsing to support bare identifiers and dotted paths.
2. Add shared scope resolution with `local -> props -> context`.
3. Add tests for shorthand, precedence, and fallback to `(get ...)`.

### Milestone D: Structured Attributes

Status: complete

1. Add `&attrs` handling.
2. Normalize booleans and empty values.
3. Define and test merge precedence with explicit attributes.

### Milestone E: Composition

Status: complete

1. Add `fragment` alias.
2. Update docs to recommend `fragment` for plain insertion/composition.
3. Add function component registration support.

### Milestone F: Optional Syntax Work

Status: complete as a decision milestone

1. Evaluate whether the shipped `&foreach` aliasing is sufficient.
2. Conclude that block directives remain optional and should move to a separate future RFC if needed.
3. Conclude that interpolation syntax remains optional and should move to a separate future RFC if needed.

## Testing Plan

The current HTMLisp test suite is already organized well enough to absorb these changes. New coverage should be added to both async and sync test directories.

Implemented additions:

- `htmlisp/html-tests/ergonomics_test.ts`
- `htmlisp/html-tests-sync/ergonomics_test.ts`
- alias coverage in `htmlisp/html-tests/foreach_test.ts`
- alias coverage in `htmlisp/html-tests-sync/foreach_test.ts`
- `deno task check:types` for typed test coverage without execution

### Required New Test Areas

#### Escaping

- text children escape `<`, `>`, `&`, and quotes as expected
- attribute values escape correctly
- `raw(...)` bypasses escaping
- rendered component children do not double escape
- compatibility mode preserves legacy behavior

#### Scoped Lookup

- bare identifier resolves from `props`
- dotted path resolves nested values
- `local` shadows `props`
- `props` shadows `context`
- explicit `(get props ...)` still works

#### Structured Attributes

- `&attrs` merges into output attributes
- `true` becomes a boolean attribute
- `false`, `null`, and `undefined` are omitted
- explicit attribute beats `&attrs`

#### Components

- string component registration still works
- sync function component works in sync renderer
- async function component works in async renderer
- sync renderer rejects async components clearly

#### Fragment Behavior

- `fragment` renders children without wrapper output
- `fragment &children="..."` works for composed markup
- `noop` behavior remains unchanged

### Migration Safety Tests

Add compatibility tests based on real templates from this repo before migrating them. The highest-value candidates are:

- `src/view/students/panel.htmlisp.ts`
- `src/view/dashboard/students-table.htmlisp.ts`
- `src/view/shared.htmlisp.ts`
- `src/ui/button.htmlisp.ts`

## Migration Plan For This Repo

After the completed runtime changes stabilize in downstream use:

1. enable `escapeByDefault` only for this repo
2. add `raw(...)` where content is already trusted rendered HTML
3. remove redundant `escapeHtml(...)` calls from view preparation code
4. replace repeated `(get props ...)` patterns with shorthand
5. convert helper-level string attribute plumbing to `&attrs`
6. replace child-insertion-only `noop` usage with `fragment`

Migration should happen in small passes, not one sweep.

Current status:

- the language/runtime support is in place
- the repo migration itself is intentionally separate from the runtime evolution plan
- any downstream migration checklist should be tracked in repo-specific work, not as open scope in this document

## Risks And Mitigations

### Risk: Double Escaping

If rendered component children are treated as plain strings, `escapeByDefault` will break composition.

Mitigation:

- introduce a trusted raw wrapper for renderer-produced HTML
- test nested component and slot composition early

### Risk: Sync And Async Drift

Feature work can easily diverge between sync and async renderers.

Mitigation:

- extract shared helpers first
- require equivalent tests for both paths

### Risk: `noop` Semantics Become Confusing

Adding `fragment` can create overlap if the docs are vague.

Mitigation:

- define `fragment` as the default composition primitive
- keep `noop` documented for advanced local/type behavior only

### Risk: Parser Scope Creep

Block syntax and interpolation can turn into a rewrite.

Mitigation:

- do not start parser work until phase 1 and phase 2 ship
- re-evaluate whether the remaining pain still justifies the cost

## Non-Goals

- browser-side reactivity
- JSX adoption
- a compiler-only architecture
- arbitrary JavaScript expression evaluation
- replacing existing HTMLisp syntax wholesale

## Final Recommendation

HTMLisp should evolve by making the current syntax safer and shorter before adding a second syntax system.

The first wave has already shipped:

1. escape by default with explicit raw output
2. shorthand scoped variable access inside existing `&...` attributes
3. structured attributes with `&attrs`

Those changes, plus `fragment`, function components, loop aliasing, and typed test coverage, solve most of the pain described in the original notes. The remaining parser-level ideas are now separate follow-up questions, not unfinished work for this plan.

## Plan Closure

This evolution plan is complete.

What shipped:

1. escape by default with explicit raw output
2. shorthand scoped variable access inside existing `&...` attributes
3. structured attributes with `&attrs`
4. `fragment` as the default wrapperless composition primitive
5. typed function components
6. loop alias syntax through `&foreach="items as item"`
7. ergonomics and typing coverage for the new behavior

What remains outside this plan:

1. repo-specific migration work
2. any future RFC for block directives
3. any future RFC for interpolation syntax
