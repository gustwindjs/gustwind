import type { Utilities } from "../breezewind/types.ts";

type Attributes = Record<string, string> | null;
type Components = Record<string, string>;
type Context = Record<string, unknown>;

type HtmllispToHTMLParameters = {
  htmlInput?: string;
  components?: Components;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
};

export type { Attributes, Components, Context, HtmllispToHTMLParameters };
