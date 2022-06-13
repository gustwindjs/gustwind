// https://stackoverflow.com/questions/2206892/jquery-convert-dom-element-to-different-type/59147202#59147202
function changeTag(element: HTMLElement, tag: string) {
  // prepare the elements
  const newElem = document.createElement(tag);
  const clone = element.cloneNode(true);

  // move the children from the clone to the new element
  while (clone.firstChild) {
    newElem.appendChild(clone.firstChild);
  }

  // copy the attributes
  // @ts-ignore Fine like this
  for (const attr of clone.attributes) {
    newElem.setAttribute(attr.name, attr.value);
  }
  return newElem;
}

export { changeTag };
