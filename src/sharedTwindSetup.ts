import * as colors from "twind-colors";
import typography from "twind-typography";

// TODO: A good production optimization would be to enable hash: true
const sharedTwindSetup = {
  // https://twind.dev/handbook/configuration.html#mode
  mode: "silent",
  theme: { colors },
  plugins: {
    // TODO: How to override blockquote styles?
    ...typography(),
  },
};

export default sharedTwindSetup;
