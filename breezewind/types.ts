type Context = Record<string, unknown>;

type BaseComponent = {
  // TODO: Rename as type
  element?: PossibleParameter;

  attributes?: Record<string, PossibleParameter | undefined>;
  props?: Context;
  closingCharacter?: string;

  children?: Component[] | PossibleParameter;

  // TODO: Eliminate?
  "##children"?: string; // Rendering binding
};

type PossibleParameter =
  | string
  | (LookupPair & {
    utility?: never;
    parameters?: never;
  })
  | (Utility & {
    context?: never;
    property?: never;
    value?: never;
    default?: never;
  });

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
