import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { sanitizeMarkdownHtml } from './content';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

export async function renderMarkdown(markdown: string): Promise<string> {
  const html = await marked.parse(markdown, { async: false });
  return sanitizeMarkdownHtml(typeof html === 'string' ? html : String(html));
}
