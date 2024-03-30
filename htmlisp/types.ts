import type { Context, Utilities } from "../types.ts";

type Attributes = Record<string, string | null>;
type Components = Record<string, string>;

type Element = {
  type: string;
  attributes?: Attributes;
  children: (string | Element)[];
  closesWith?: string | null;
};

type HtmllispToHTMLParameters = {
  htmlInput?: string;
  components?: Components;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
};

export type {
  Attributes,
  Components,
  Context,
  Element,
  HtmllispToHTMLParameters,
};
