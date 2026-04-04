import typography from "@tailwindcss/typography";
import { type Config } from "tailwindcss";

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
