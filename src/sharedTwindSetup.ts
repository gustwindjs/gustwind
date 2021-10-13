import * as colors from "twind-colors";
import typography from "twind-typography";

const sharedTwindSetup = {
  theme: { colors },
  plugins: {
    // TODO: How to override blockquote styles?
    ...typography(),
  },
};

export default sharedTwindSetup;
