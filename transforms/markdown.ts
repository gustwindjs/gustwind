import { Marked } from "markdown";

function transformMarkdown(input: string) {
  return Marked.parse(input).content;
}

export default transformMarkdown;
