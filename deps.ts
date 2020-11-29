import { Application } from "https://deno.land/x/oak@v6.3.2/mod.ts";
import {
  getStyleTag,
  VirtualInjector,
} from "https://unpkg.com/otion@0.6.2/server/index.mjs";
import {
  setup as setupOceanwind,
  themed,
} from "https://unpkg.com/oceanwind@0.9.0/index.js";

// TODO: Pass custom theme here
const ow = themed({});

const getStyleInjector = () => {
  const injector = VirtualInjector();

  setupOceanwind({ injector });

  return injector;
};

const readJSONSync = (file: string) => JSON.parse(Deno.readTextFileSync(file));

export {
  Application,
  getStyleInjector,
  getStyleTag,
  ow,
  readJSONSync,
  setupOceanwind,
};
