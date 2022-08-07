type Context = Record<string, unknown>;

type BaseComponent = {
  type?: string | Utility;

  attributes?: Record<string, string | Utility | undefined>;
  props?: Context;
  bindToProps?: Record<string, Utility>;
  closingCharacter?: string;

  children?: string | Component[] | Utility;

  // TODO: Eliminate by providing a render utility
  "##children"?: string; // Rendering binding
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

// deno-lint-ignore no-explicit-any
type Utilities = Record<string, (...args: any) => string | Promise<string>>;

export type {
  ClassComponent,
  ClassList,
  Component,
  Context,
  Extension,
  ForEachComponent,
  Utilities,
  Utility,
  VisibleIfComponent,
};
