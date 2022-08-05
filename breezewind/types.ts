type Context = Record<string, unknown>;

type Utility = {
  utility: string;
  parameters?: string[];
};

type BaseComponent = {
  // TODO: Rename as type
  element?: string;

  // TODO: Consider eliminating
  __element?: string; // Getter binding

  // TODO: Eliminate
  "==element"?: string; // Evaluation binding

  attributes?: Record<string, Utility | string | undefined>;
  props?: Context;
  closingCharacter?: string;

  children?: string | Component[] | Utility;

  // TODO: Consider eliminating
  __children?: string; // Getter binding

  // TODO: Consider eliminating
  "##children"?: string; // Rendering binding
};

type LookupPair = { context: string; property: string; value?: never };
type Value = { context?: never; property?: never; value: string };
type ClassOptions = LookupPair | Value;
type ClassList = Record<string, ClassOptions[]>;

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
type Utilities = Record<string, (args?: any) => string>;

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
