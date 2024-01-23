import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.5";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
import presetTypography from "https://esm.sh/@twind/preset-typography@1.0.5";
import meta from "./meta.json" assert { type: "json" };

export default {
  presets: [presetAutoprefix(), presetTailwind(), presetTypography()],
  rules: [
    ["btn", "font-bold py-2 px-4 rounded"],
    ["btn-blue", "bg-blue-500 hover:bg-blue-700 text-white"],
    ["btn-muted", "font-light text-gray-500"],
    // https://twind.style/rules#static-rules
    ["mask-text", { color: "transparent", textShadow: "0 0 black" }],
    // For navigation
    ["pointer-events-all", { pointerEvents: "all" }],
  ],
  theme: {
    extend: {
      colors: meta.colors,
    },
  },
  hash: false,
};
