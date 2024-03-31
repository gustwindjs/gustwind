const LIMIT = 100000;

// Adapted from Sidewind
function getParents(
  element: Element,
  attribute: string,
) {
  const ret = [];
  let parent = element.parentElement;

  for (let i = 0; i < LIMIT; i++) {
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
