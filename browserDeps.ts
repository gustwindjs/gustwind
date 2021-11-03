import * as immer from "https://cdn.skypack.dev/immer@9.0.6?min";
import * as nanoid from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import * as twind from "https://cdn.skypack.dev/twind@0.16.16?min";
import * as twindColors from "https://cdn.skypack.dev/twind@0.16.16/colors?min";
import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import * as twindShim from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import twindTypography from "https://cdn.skypack.dev/@twind/typography@0.0.2?min";

const id = nanoid.nanoid;

export {
  id as nanoid,
  immer,
  twind,
  twindColors,
  twindSheets,
  twindShim,
  twindTypography,
};
