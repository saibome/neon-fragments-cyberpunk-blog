import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import sanitizeHtml from 'sanitize-html';

const KEEP_CLASS_RE = /^(hljs|hljs-[\w-]+|language-[\w+#-]+)$/;

/** 中文按字、英文按词估算阅读时长 */
export function computeReadTime(markdown: string): string {
  const chinese = markdown.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = markdown.replace(/[\u3400-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return `约 ${Math.max(1, Math.ceil(chinese / 400 + words / 200))} 分钟`;
}

/** 构建期统一消毒：只保留 Markdown / highlight.js 会产出的标签与属性 */
export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'strong', 'em', 'del', 's', 'blockquote', 'sup', 'sub',
      'ul', 'ol', 'li', 'pre', 'code', 'span', 'a', 'img',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      span: ['class'],
      th: ['align'],
      td: ['align']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe', 'object'],
    transformTags: {
      '*': (tagName, attribs) => {
        if (attribs.class) {
          const kept = attribs.class.split(/\s+/).filter(name => KEEP_CLASS_RE.test(name)).join(' ');
          if (kept) attribs.class = kept;
          else delete attribs.class;
        }
        return { tagName, attribs };
      }
    }
  });
}

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

/** 内容集合的 entry.body 是原始 Markdown，这里统一渲染为可安全注入的 HTML */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false });
  return sanitizeMarkdownHtml(typeof html === 'string' ? html : String(html));
}
