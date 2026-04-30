import type { Context, Utilities } from "../types.ts";

type Attributes = Record<string, string | boolean | null>;
type ForeachBinding = {
  items: unknown[];
  alias?: string;
};
type RawHtml = {
  __htmlispRaw: true;
  value: string;
};
type HtmlispRenderOptions = {
  escapeByDefault?: boolean;
};
type HTMLispComponent<Props = Context> =
  | string
  | ((props: Props) => string | Promise<string>);
type Components = Record<string, HTMLispComponent>;

type Element = {
  type: string;
  attributes?: Attributes;
  children: (string | Element)[];
  closesWith?: string | null;
};

type HtmlispToHTMLParameters = {
  htmlInput?: string;
  components?: Components;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
  renderOptions?: HtmlispRenderOptions;
};
/** @deprecated Use HtmlispToHTMLParameters instead. */
type HtmllispToHTMLParameters = HtmlispToHTMLParameters;

export type {
  Attributes,
  Components,
  Context,
  Element,
  ForeachBinding,
  HTMLispComponent,
  HtmlispRenderOptions,
  HtmlispToHTMLParameters,
  HtmllispToHTMLParameters,
  RawHtml,
};
