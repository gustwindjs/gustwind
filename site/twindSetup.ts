import presetTypography from "https://esm.sh/@twind/preset-typography@1.0.5";

export default {
  presets: [presetTypography()],
  plugins: {
    btn: "font-bold py-2 px-4 rounded",
    "btn-blue": "bg-blue-500 hover:bg-blue-700 text-white",
    "btn-muted": "font-light text-gray-500",
  },
};
