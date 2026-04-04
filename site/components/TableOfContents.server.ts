function tw(...classNames: string[]) {
  return classNames.join(" ");
}

function init() {
  return { tw };
}

export { init };
