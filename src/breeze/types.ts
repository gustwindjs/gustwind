type BaseComponent = {
  element?: string;
  attributes?: Record<string, string | undefined>;

  children?: string | Component[];

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
type Component = BaseComponent | ClassComponent;

type Extension = (component: Component) => BaseComponent;

export type { ClassComponent, Component, Extension };
