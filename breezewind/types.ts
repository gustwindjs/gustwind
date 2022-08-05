type Context = Record<string, unknown>;

type BaseComponent = {
  // TODO: Rename as type
  element?: string | LookupPair | Utility;

  attributes?: Record<string, LookupPair | Utility | string | undefined>;
  props?: Context;
  closingCharacter?: string;

  children?: string | Component[] | LookupPair | Utility;

  // TODO: Eliminate
  "##children"?: string; // Rendering binding
};

type ClassOptions = LookupPair | Value;
type ClassList = Record<string, ClassOptions[]>;
type Utility = {
  utility: string;
  parameters?: (string | LookupPair)[];
};
type LookupPair = {
  context: string;
  property: string;
  value?: never;
  default?: string;
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
  class?: string;
  "__class"?: string;
  "==class"?: string;
};
type ForEachComponent = BaseComponent & {
  foreach?: [string, Component | Component[]];
};
type VisibleIfComponent = BaseComponent & {
  visibleIf?: LookupPair[];
};
type Component =
  | BaseComponent
  | ClassComponent
  | ForEachComponent
  | VisibleIfComponent;

type Extension = (
  component: Component,
  context: Context,
) => BaseComponent;

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
