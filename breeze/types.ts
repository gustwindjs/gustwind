type Context = Record<string, unknown>;

type BaseComponent = {
  element?: string;
  __element?: string; // Getter binding

  attributes?: Record<string, string | undefined>;
  props?: Context;
  closingCharacter?: string;

  children?: string | Component[];
  __children?: string; // Getter binding
  "==children"?: string; // Evaluation binding
  "##children"?: string; // Rendering binding
};
type ClassComponent = BaseComponent & {
  classList?: Record<string, string>;
  class?: string;
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
