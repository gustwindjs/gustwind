import { presetTypography } from "https://esm.sh/@unocss/preset-typography@0.57.2";
import { presetUno } from "https://esm.sh/@unocss/preset-uno@0.57.2";
import { presetWind } from "https://esm.sh/@unocss/preset-wind@0.57.2";

export default {
  presets: [presetUno(), presetWind(), presetTypography()],
  plugins: {
    btn: "font-bold py-2 px-4 rounded",
    "btn-blue": "bg-blue-500 hover:bg-blue-700 text-white",
    "btn-muted": "font-light text-gray-500",
  },
  rules: [
    // https://twind.style/rules#static-rules
    ["mask-text", { color: "transparent", textShadow: "0 0 black" }],
    // For navigation
    ["pointer-events-all", { pointerEvents: "all" }],
  ],
};
