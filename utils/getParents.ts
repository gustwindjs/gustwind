// Adapted from Sidewind
function getParents(
  element: Element,
  attribute: string,
) {
  const ret = [];
  let parent = element.parentElement;

  while (true) {
    if (!parent) {
      break;
    }

    if (parent.hasAttribute(attribute)) {
      ret.push(parent);
    }

    parent = parent.parentElement;
  }

  return ret;
}

export { getParents };
