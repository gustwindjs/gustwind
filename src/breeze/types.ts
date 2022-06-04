type Context = Record<string, unknown>;

type BaseComponent = {
  element?: string;
  attributes?: Record<string, string | undefined>;

  children?: string | Component[];

  // Value binding
  __value?: string | Context;

  // Getter binding
  __children?: string;

  // Evaluation binding
  "==children"?: string;
};
type ClassComponent = BaseComponent & {
  class?: string;
  __class?: string;
  "==class"?: string;
};
type ForEachComponent = BaseComponent & {
  foreach?: [string, Component | Component[]];
};
type Component = BaseComponent | ClassComponent | ForEachComponent;

type Extension = (component: Component, context?: Context) => BaseComponent;

export type { ClassComponent, Component, Context, Extension, ForEachComponent };
