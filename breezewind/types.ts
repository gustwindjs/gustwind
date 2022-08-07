type Context = Record<string, unknown>;

type BaseComponent = {
  // TODO: Rename as type
  element?: string | Utility;

  attributes?: Record<string, string | Utility | undefined>;
  props?: Context;
  bindToProps?: Record<string, Utility>;
  closingCharacter?: string;

  children?: string | Component[] | Utility;

  // TODO: Eliminate?
  "##children"?: string; // Rendering binding
};

type ClassOptions = Utility | Value;
type ClassList = Record<string, ClassOptions[]>;
type Utility = {
  utility: string;
  parameters?: (string | Utility)[];
};

// TODO: Maybe this one can be dropped (comes from claslist)
type Value = {
  context?: never;
  property?: never;
  value: string;
  default?: never;
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
  ClassOptions,
  Component,
  Context,
  Extension,
  ForEachComponent,
  Utilities,
  Utility,
  VisibleIfComponent,
};
