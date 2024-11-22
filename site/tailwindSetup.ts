import typography from "npm:@tailwindcss/typography@0.5.15";
import { type Config } from "npm:tailwindcss@3.4.15";

const colors = {
  "primary": "#3a2fa6",
  "secondary": "#84ebec",
  "tertiary": "#ffffff",
};

const config: Config = {
  content: ["./site/**/*.{html,js}"],
  theme: { extend: { colors } },
  plugins: [typography],
};

export default config;
