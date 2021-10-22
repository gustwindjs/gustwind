// Modernized version of https://github.com/bebraw/dragjs
type Callback = (
  { cursor, elem, pointer }: {
    cursor: Coordinate;
    elem: HTMLElement;
    pointer?: HTMLElement;
  },
) => void;
type Callbacks = {
  begin: Callback;
  change: Callback;
  end: Callback;
};

function draggable(
  { element, handle }: { element: HTMLElement; handle?: HTMLElement },
  cbs?: Callbacks,
) {
  if (!element) {
    console.warn("drag is missing elem!");
    return;
  }

  dragTemplate(element, "touchstart", "touchmove", "touchend", cbs, handle);
  dragTemplate(element, "mousedown", "mousemove", "mouseup", cbs, handle);
}

function xyslider(o: { parent: HTMLElement; class: string; cbs: Callbacks }) {
  const twod = div(o["class"] || "", o.parent);
  const pointer = div("pointer", twod);

  div("shape shape1", pointer);
  div("shape shape2", pointer);
  div("bg bg1", twod);
  div("bg bg2", twod);

  draggable({ element: twod }, attachPointer(o.cbs, pointer));

  return {
    background: twod,
    pointer: pointer,
  };
}

function slider(o: { parent: HTMLElement; class: string; cbs: Callbacks }) {
  const oned = div(o["class"], o.parent);
  const pointer = div("pointer", oned);

  div("shape", pointer);
  div("bg", oned);

  draggable({ element: oned }, attachPointer(o.cbs, pointer));

  return {
    background: oned,
    pointer: pointer,
  };
}

function attachPointer(cbs: Callbacks, pointer: HTMLElement): Callbacks {
  const ret: Record<string, Callback> = {};

  Object.entries(cbs).forEach(([name, callback]) => {
    ret[name] = (p) => {
      callback({ ...p, pointer });
    };
  });

  return ret as Callbacks;
}

// move to elemutils lib?
function div(klass: string, p: HTMLElement) {
  return e("div", klass, p);
}

function e(type: string, klass: string, p: HTMLElement) {
  const elem = document.createElement(type);

  if (klass) {
    elem.className = klass;
  }
  p.appendChild(elem);

  return elem;
}

function dragTemplate(
  elem: HTMLElement,
  down: string,
  move: string,
  up: string,
  cbs?: Callbacks,
  handle?: HTMLElement,
) {
  cbs = getCbs(cbs);

  const beginCb = cbs.begin;
  const changeCb = cbs.change;
  const endCb = cbs.end;

  on(handle || elem, down, (e) => {
    // @ts-ignore Figure out how to type this
    const moveHandler = (e: Event) => callCb(changeCb, elem, e);

    function upHandler() {
      off(document, move, moveHandler);
      off(document, up, upHandler);

      // @ts-ignore Figure out how to type this
      callCb(endCb, elem, e);
    }

    on(document, move, moveHandler);
    on(document, up, upHandler);

    // @ts-ignore Figure out how to type this
    callCb(beginCb, elem, e);
  });
}

// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
function on(
  elem: HTMLElement | Document,
  evt: string,
  handler: (e: Event) => void,
) {
  // Test via a getter in the options object to see if the passive property is accessed
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, "passive", {
      get: function () {
        supportsPassive = true;

        return undefined;
      },
    });
    globalThis.addEventListener("testPassive", null, opts);
    globalThis.removeEventListener("testPassive", null, opts);
  } catch (err) {
    console.error(err);
  }

  elem.addEventListener(
    evt,
    handler,
    supportsPassive ? { passive: false } : false,
  );
}

function off(
  elem: HTMLElement | Document,
  evt: string,
  handler: (event: Event) => void,
) {
  elem.removeEventListener(evt, handler, false);
}

type Coordinate = { x: number; y: number };

function getCbs(cbs?: Callbacks): Callbacks {
  if (cbs) {
    return {
      begin: cbs.begin || noop,
      change: cbs.change || noop,
      end: cbs.end || noop,
    };
  }

  let initialOffset: Coordinate;
  let initialPos: Coordinate;

  return {
    begin: function (c) {
      initialOffset = { x: c.elem.offsetLeft, y: c.elem.offsetTop };
      initialPos = c.cursor;
    },
    change: function (c) {
      if (
        typeof initialOffset.x !== "number" || typeof c.cursor.x !== "number" ||
        typeof initialPos.x !== "number"
      ) {
        return;
      }

      style(
        c.elem,
        "left",
        (initialOffset.x + c.cursor.x - initialPos.x) + "px",
      );

      if (
        typeof initialOffset.y !== "number" || typeof c.cursor.y !== "number" ||
        typeof initialPos.y !== "number"
      ) {
        return;
      }

      style(
        c.elem,
        "top",
        (initialOffset.y + c.cursor.y - initialPos.y) + "px",
      );
    },
    end: noop,
  };
}

function isValidNumber(c: Record<string, unknown>, v: keyof Coordinate) {
  return c[v] && typeof c[v] === "number";
}

// TODO: set draggable class (handy for fx)
function style(e: HTMLElement, prop: string, value: string) {
  // @ts-ignore https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style#setting_styles
  e.style[prop] = value;
}

function noop() {}

function callCb(
  cb: (
    { x, y, cursor, elem, e }: {
      x: number;
      y: number;
      cursor: Coordinate;
      elem: HTMLElement;
      e: Event;
    },
  ) => void,
  elem: HTMLElement,
  e: MouseEvent | TouchEvent,
) {
  e.preventDefault();

  const offset = findPos(elem);
  const width = elem.clientWidth;
  const height = elem.clientHeight;
  const cursor = {
    x: cursorX(elem, e),
    y: cursorY(elem, e),
  };

  if (typeof cursor.x !== "number" || typeof cursor.y !== "number") {
    return;
  }

  const x = (cursor.x - offset.x) / width;
  const y = (cursor.y - offset.y) / height;

  cb({
    x: isNaN(x) ? 0 : x,
    y: isNaN(y) ? 0 : y,
    cursor: cursor as Coordinate,
    elem,
    e,
  });
}

// http://www.quirksmode.org/js/findpos.html
function findPos(e: HTMLElement) {
  const r = e.getBoundingClientRect();

  return {
    x: r.left,
    y: r.top,
  };
}

// http://javascript.about.com/library/blmousepos.htm
function cursorX(_elem: HTMLElement, evt: MouseEvent | TouchEvent) {
  if (evt instanceof TouchEvent) {
    return evt.touches.item(0)?.clientX;
  }

  return evt.clientX;
}
function cursorY(_elem: HTMLElement, evt: MouseEvent | TouchEvent) {
  if (evt instanceof TouchEvent) {
    return evt.touches.item(0)?.clientY;
  }

  return evt.clientY;
}

export { draggable, slider, xyslider };
