type Component = {
  element?: string;
  attributes?: Record<string, string | undefined>;

  children?: string | Component[];

  // Getter binding
  __children?: string;

  // Evaluation binding
  "==children"?: string;
};
type ClassComponent = Component & { class?: string };

type Extension = (component: Component | ClassComponent) => Component;

export type { ClassComponent, Component, Extension };
