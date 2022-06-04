type Component = {
  element?: string;
  children?: string | Component[];
};

function render(component: Component): string {
  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = children.map((c) => render(c)).join("");
    }

    if (component.element) {
      return `<${component.element}>${children}</${component.element}>`;
    }

    return children;
  }

  if (component.element) {
    return `<${component.element} />`;
  }

  return "";
}

export default render;
