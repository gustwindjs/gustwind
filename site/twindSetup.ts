const colors = {
  "primary": "#3a2fa6",
  "secondary": "#84ebec",
  "tertiary": "#ffffff",
};

export default {
  presets: [],
  rules: [
    ["btn", "font-bold py-2 px-4 rounded"],
    ["btn-blue", "bg-blue-500 hover:bg-blue-700 text-white"],
    ["btn-muted", "font-light text-gray-500"],
    // https://twind.style/rules#static-rules
    ["mask-text", { color: "transparent", textShadow: "0 0 black" }],
    // For navigation
    ["pointer-events-all", { pointerEvents: "all" }],
  ],
  theme: { extend: { colors } },
  hash: false,
};
