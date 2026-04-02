# HTMLisp Evolution Plan

This note documents targeted changes that would make HTMLisp a better fit for this project without changing the underlying application architecture.

The goal is not to turn the app into a client-heavy UI system. The goal is to keep the current small, server-rendered model while reducing template ceremony, repetitive escaping, and helper-layer workarounds in the view/UI code.

## Why Change HTMLisp

The current HTMLisp usage works, but a few pain points appear repeatedly in the codebase:

- values are escaped manually before being passed into templates
- templates repeat `(get props ...)` heavily
- inserting pre-rendered child HTML often requires `<noop &children="..."></noop>`
- conditional and list rendering are functional but noisy
- component helpers sometimes need string parsing or token replacement to express normal HTML patterns

Examples of the current friction are visible in:

- [`src/view/shared.htmlisp.ts`](../src/view/shared.htmlisp.ts)
- [`src/view/students/panel.htmlisp.ts`](../src/view/students/panel.htmlisp.ts)
- [`src/view/dashboard/students-table.htmlisp.ts`](../src/view/dashboard/students-table.htmlisp.ts)
- [`src/ui/button.htmlisp.ts`](../src/ui/button.htmlisp.ts)

## Design Principles

- Keep HTMLisp server-rendered and runtime-light.
- Prefer incremental, backward-compatible language changes first.
- Make templates read more like HTML and less like prop plumbing.
- Escape by default.
- Make raw HTML insertion explicit.
- Improve ergonomics without forcing a framework-style component model.

## Recommended Direction

The recommended path is to evolve HTMLisp toward "HTML plus scoped expressions" instead of making it more Lisp-heavy.

That means:

- HTML remains the primary surface syntax.
- data expressions become shorter and scope-aware
- escaped output is the default behavior
- raw HTML output requires an explicit marker
- common patterns such as fragments, loops, and attribute spread become first-class

## Proposed Changes

### 1. Escape By Default

#### Problem

The app currently escapes most values before they ever reach the template layer. That creates repetitive preparation code and spreads XSS responsibility across many call sites.

#### Proposal

- Treat normal string output as escaped by default.
- Add an explicit raw HTML escape hatch for trusted pre-rendered HTML fragments.

#### Suggested Syntax

Use one explicit raw helper inside expressions:

```html
<div &children="(raw summaryHtml)"></div>
```

or, if text interpolation support is added later:

```html
<div>{raw(summaryHtml)}</div>
```

#### Result

- most `escapeHtml(...)` calls in view preparation code can disappear
- the dangerous path becomes visible and auditable
- template authors no longer need to remember which values were pre-escaped upstream

#### Compatibility

- keep existing behavior working during migration
- add a renderer option such as `escapeByDefault: true`
- migrate this repo after the feature is stable, then remove most explicit escaping from the view layer

### 2. Scoped Variable Access Without `(get props ...)`

#### Problem

Current templates repeatedly spell out `(get props foo)`, even for simple values.

#### Proposal

- Allow direct variable references inside expression positions.
- Keep `props` as the root scope, but expose its keys directly in templates.
- Inside loops, expose the current item fields directly or by alias.

#### Suggested Syntax

Current:

```html
<p &class="(get props subtleText)" &children="(get props message)"></p>
```

Proposed:

```html
<p &class="subtleText" &children="message"></p>
```

Current loop:

```html
<noop &foreach="(get props readonlyFields)">
  <dd &children="(get props text)"></dd>
</noop>
```

Proposed:

```html
<noop &foreach="readonlyFields as field">
  <dd &children="field.text"></dd>
</noop>
```

#### Result

- templates become much easier to scan
- loop scope becomes clearer
- the renderer can still keep a simple internal scope model

#### Compatibility

- preserve `(get props ...)` support
- treat the shorthand as syntactic sugar over the same runtime lookup

### 3. First-Class Raw Child Insertion Without `noop`

#### Problem

A large amount of template code exists only to insert already-rendered HTML:

```html
<noop &children="(get props submitButton)"></noop>
```

#### Proposal

Add a dedicated fragment or insertion syntax so pre-rendered children do not require a fake tag.

#### Suggested Syntax

Preferred:

```html
<fragment &children="submitButton"></fragment>
```

Compact alternative:

```html
{@html submitButton}
```

#### Result

- less visual noise in composed page templates
- better distinction between actual HTML elements and template-only insertion points

#### Compatibility

- keep `noop` working
- gradually replace `noop` where it is only used as an insertion shim

### 4. Better Conditionals And Loops

#### Problem

`&visibleIf` and `&foreach` are workable, but they are attribute-driven control flow attached to placeholder nodes. That makes larger templates harder to parse mentally.

#### Proposal

Keep the current directives, but add block forms that are easier to read.

#### Suggested Syntax

Conditionals:

```html
{@if topicVisible}
  <p &class="topicTextClass">{topic}</p>
{/if}
```

Loops:

```html
{@for field in readonlyFields}
  <dd>{field.text}</dd>
{/for}
```

#### Result

- control flow becomes structurally visible
- fewer placeholder tags
- easier syntax highlighting and better future formatter support

#### Compatibility

- keep `&visibleIf` and `&foreach` for existing templates
- encourage block syntax for new templates after the grammar is ready

### 5. Attribute Spread And Structured Attributes

#### Problem

Some helpers, especially button-like helpers, need to parse string attributes and inject them back into templates. That is extra complexity for a normal HTML use case.

#### Proposal

- support structured attribute maps
- support attribute spread at render time
- keep string attributes only as a compatibility path

#### Suggested Syntax

```html
<button
  &type="type"
  &class="className"
  &attrs="extraAttributes"
  &children="label"
></button>
```

If block or interpolation syntax expands later, a spread form is even better:

```html
<button type={type} class={className} {...extraAttributes}>{label}</button>
```

#### Result

- removes the need for token replacement tricks
- makes helpers like [`src/ui/button.htmlisp.ts`](../src/ui/button.htmlisp.ts) smaller and safer
- gives the renderer clearer semantics for boolean and optional attributes

#### Compatibility

- keep parsing string attributes for older helpers
- prefer structured attributes in new helper code

### 6. Typed Function Components Instead Of Template-String Components

#### Problem

Local component dictionaries are useful, but large string-defined components nested inside TypeScript files are still awkward to maintain.

#### Proposal

Allow HTMLisp components to be registered as typed functions that return HTMLisp or rendered HTML, not only as raw template strings.

#### Suggested Shape

```ts
interface MeetingLogEntryProps {
  timestampText: string;
  discussed: string;
  agreedPlan: string;
  hasDeadline: boolean;
  deadlineText: string;
}

const components = {
  MeetingLogEntry: htmlispComponent<MeetingLogEntryProps>((props) => `
    <article class="...">
      <p>${props.timestampText}</p>
    </article>
  `),
};
```

The exact API can vary. The important part is that components should be typed and avoid large anonymous template dictionaries where possible.

#### Result

- better editor support from TypeScript
- easier refactoring
- fewer deeply nested string literals

#### Compatibility

- keep string components supported
- add function components as an additional registration form

## Priority Order

The following implementation order gives the best value without forcing a full language rewrite.

### Phase 1: High-Value, Low-Risk

- escape by default with explicit raw output
- shorthand variable access without `(get props ...)`
- structured attributes and attribute spread support

### Phase 2: Ergonomic Template Composition

- dedicated raw child insertion instead of `noop`
- block conditionals and loops

### Phase 3: Deeper Authoring Improvements

- typed function components
- optional interpolation syntax for text and attributes if still needed

## Suggested Syntax Baseline

To keep implementation manageable, the recommended baseline is:

- keep current HTMLisp valid
- add shorthand expressions inside existing `&...` expression attributes first
- add raw output semantics before adding broader syntax sugar
- add block control flow only after shorthand scope lookup is stable

In other words, this is the preferred order:

1. make existing syntax less noisy
2. make insertion and control flow cleaner
3. consider larger syntax upgrades only if the earlier steps still feel insufficient

## Migration Strategy For This Repo

Once the language changes are available, migrate this repo in small passes:

1. Enable escape-by-default in HTMLisp and add explicit raw output where needed.
2. Remove unnecessary `escapeHtml(...)` calls from view and UI modules.
3. Replace repeated `(get props ...)` usage with shorthand scope access.
4. Convert child-insertion-only `noop` usage to the new insertion syntax.
5. Replace string attribute plumbing in helpers with structured attrs.
6. Convert the densest templates first:
   - [`src/view/students/panel.htmlisp.ts`](../src/view/students/panel.htmlisp.ts)
   - [`src/view/dashboard/students-table.htmlisp.ts`](../src/view/dashboard/students-table.htmlisp.ts)
   - [`src/view/shared.htmlisp.ts`](../src/view/shared.htmlisp.ts)

## Implementation Checklist For HTMLisp

### Parser And Renderer

- add scoped identifier lookup
- add escape-by-default behavior
- add explicit raw value support
- add structured attribute support
- add child insertion syntax
- add block control-flow parsing if chosen

### Types

- define a raw HTML wrapper type
- extend component registration types for structured attrs and function components
- expose clear renderer options for compatibility mode versus new mode

### Editor Support

Update the local extension under [`editor-support/vscode-htmlisp/`](../editor-support/vscode-htmlisp):

- syntax highlighting for shorthand expressions
- syntax highlighting for any new block directives
- syntax highlighting for raw output markers
- bracket and scope support for the new syntax

### Tests

Add or update coverage for:

- escaping behavior
- raw HTML output
- shorthand scope lookup
- loop scoping
- structured attrs and boolean attrs
- compatibility with existing HTMLisp templates in this repo

## Non-Goals

- adding a browser-side reactive runtime
- replacing the app with React, Vue, or another client framework
- making HTMLisp depend on JSX or a build-time compiler for normal usage

## Decision Summary

The most valuable change is not a full rewrite of HTMLisp syntax. The most valuable change is to remove template ceremony while preserving the current server-rendered architecture.

If only three things get implemented, they should be:

1. escape by default with explicit raw output
2. direct scoped variable access
3. structured attributes plus child insertion without `noop`
