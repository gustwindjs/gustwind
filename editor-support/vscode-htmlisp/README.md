# HTMLisp Language Support For VS Code

This extension adds:

- syntax highlighting for standalone `.htmlisp` and `.hisp` files
- a dedicated `TypeScript HTMLisp` mode for `.htmlisp.ts` files
- bracket pairing for tags and expressions
- best-effort highlighting for HTMLisp template literals inside JavaScript and TypeScript files

## Supported Syntax

- HTML-like tags and component tags such as `<SiteLink />`
- special tags such as `fragment`, `noop`, and `slot`
- expression-bound attributes such as `&children`, `&foreach`, `&visibleIf`, and `&attrs`
- comment-style metadata attributes such as `__reference`
- Lisp-style expressions inside expression-bound attribute values, including `raw(...)`
- shorthand scoped lookup inside expression-bound attribute values such as `message` and `post.slug`
- loop alias syntax such as `&foreach="items as item"`
- TypeScript as the outer language for `.htmlisp.ts` files

## Intentionally Out Of Scope

The current HTMLisp language does not ship block directives such as `{@if}` or interpolation syntax such as `{value}`. This extension therefore does not try to highlight them as first-class HTMLisp syntax.

## Running Locally

1. Open this folder in VS Code:

```text
editor-support/vscode-htmlisp
```

2. Press `F5` to launch an Extension Development Host.

3. In the new VS Code window:

- open an `.htmlisp` file, or
- open a `.htmlisp.ts` file such as `samples/dashboard.htmlisp.ts`, or
- open a JavaScript or TypeScript file containing an HTMLisp template literal

## TypeScript HTMLisp Mode

Use the dedicated `TypeScript HTMLisp` mode for files ending in `.htmlisp.ts`.

It is intended for TypeScript-heavy files that embed HTMLisp templates and should:

- preserve normal TypeScript highlighting outside template strings
- apply HTMLisp highlighting inside template literals that begin with markup
- avoid treating ordinary TypeScript strings as HTMLisp

TSX-style support is intentionally out of scope for this version.

## Install With `vsce`

The current VS Code extension manager package is `@vscode/vsce`.

Prerequisites:

- Node.js 20 or newer
- npm

From the repository root:

```bash
cd editor-support/vscode-htmlisp
npx @vscode/vsce package
```

That produces a `.vsix` file in the extension directory.

Install the generated package into VS Code with either:

1. `Extensions: Install from VSIX...` from the Command Palette, then pick the generated `.vsix`
2. the VS Code CLI:

```bash
code --install-extension htmlisp-language-0.1.0.vsix
```

If you want to publish the extension later, use the same folder as the package root and run the relevant `@vscode/vsce publish ...` command from there.
