/**
 * 正文渲染已完全交给 Astro 的 render(entry) / <Content />。
 * 这里只保留与渲染无关的纯文本工具：摘要兜底、SEO 描述与阅读时长估算。
 * 它们读的是内容集合的 entry.body（原始 Markdown），不产出任何 HTML。
 */

/** 从原始 Markdown 提取纯文本，仅用于摘要与阅读时长。 */
export function markdownToText(markdown: string): string {
  return (markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<(script|style|iframe|object|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>?/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 中文按字、英文按词估算阅读时长 */
export function computeReadTime(text: string): string {
  const chinese = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = text.replace(/[\u3400-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return `约 ${Math.max(1, Math.ceil(chinese / 400 + words / 200))} 分钟`;
}
