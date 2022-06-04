type Context = Record<string, unknown>;

type BaseComponent = {
  element?: string;
  attributes?: Record<string, string | undefined>;
  props?: Context;
  closingCharacter?: string;

  children?: string | Component[];

  // Getter binding
  __children?: string;

  // Evaluation binding
  "==children"?: string;
};
type ClassComponent = BaseComponent & {
  class?: string | Record<string, string>;
  "__class"?: string;
  "==class"?: string;
};
type ForEachComponent = BaseComponent & {
  foreach?: [string, Component | Component[]];
};
type VisibleIfComponent = BaseComponent & { visibleIf?: string };
type Component =
  | BaseComponent
  | ClassComponent
  | ForEachComponent
  | VisibleIfComponent;

type Extension = (
  component: Component,
  context: Context,
) => Promise<BaseComponent>;

type Utilities = Record<string, (args: unknown) => string>;

export type {
  ClassComponent,
  Component,
  Context,
  Extension,
  ForEachComponent,
  Utilities,
  VisibleIfComponent,
};
