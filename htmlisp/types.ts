type Context = Record<string, unknown>;
type Utilities =
  & Record<
    string,
    (
      this: { context: Context; props: Context; local?: Context },
      ...args: any
    ) => unknown | Promise<unknown> | void
  >
  & {
    _onRenderStart?: (context: Context) => void;
    _onRenderEnd?: (context: Context) => void;
  };
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
export type {
  Attributes,
  Components,
  Context,
  Element,
  ForeachBinding,
  HTMLispComponent,
  HtmlispRenderOptions,
  HtmlispToHTMLParameters,
  RawHtml,
  Utilities,
};
