type Component = {
  element?: string;
  children?: string | Component[];
  attributes?: Record<string, string | undefined>;
};
type ClassComponent = Component & { class?: string };

type Extension = (component: Component | ClassComponent) => Component;

export type { ClassComponent, Component, Extension };
