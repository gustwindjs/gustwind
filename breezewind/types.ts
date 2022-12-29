type Context = Record<string, unknown>;
type Components = Record<string, Component | Component[]>;

// TODO: Force at least either type or children field to exist
type BaseComponent = {
  type?: string | Utility;
  closingCharacter?: string;

  attributes?: Record<string, string | Utility | undefined>;
  bindToProps?: Record<string, Utility>;
  props?: Context;

  children?: string | (string | Component | Utility)[] | Utility;
};

type ClassList = Record<string, Utility[]>;
type Utility = {
  utility: string;
  parameters?: (string | Utility)[];
};

type ClassComponent = BaseComponent & {
  classList?: ClassList;
  class?: string | Utility;
};
type ForEachComponent = BaseComponent & {
  foreach?: [Utility, Component | Component[]];
};
type VisibleIfComponent = BaseComponent & {
  visibleIf?: Utility[];
};
type Component =
  | BaseComponent
  | ClassComponent
  | ForEachComponent
  | VisibleIfComponent;

type Extension = (
  component: Component,
  context: Context,
  utilities?: Utilities,
) => Promise<BaseComponent>;

type Utilities =
  & Record<
    string,
    // deno-lint-ignore no-explicit-any
    (context: Context, ...args: any) => string | Promise<string> | void
  >
  & {
    _onRenderStart?: (context: Context) => void;
    _onRenderEnd?: (context: Context) => void;
  };

export type {
  ClassComponent,
  ClassList,
  Component,
  Components,
  Context,
  Extension,
  ForEachComponent,
  Utilities,
  Utility,
  VisibleIfComponent,
};
