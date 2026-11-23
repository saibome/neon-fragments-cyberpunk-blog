/**
 * Astro Markdown 消毒配置（官方 hast 插件路径）。
 *
 * 站点内容由 Obsidian 一键发布脚本写入，正文可能夹带原始 HTML。沿用
 * GitHub 默认白名单，再放行 Astro 自身会写入的属性：图片优化产出的
 * loading/decoding、Shiki 高亮产出的 class / style / data-language。
 * 默认白名单已经拦掉 script、on* 事件、javascript: 等危险内容。
 */
import { defaultSchema } from 'rehype-sanitize';

const shikiClass = ['className', /^(astro-code|github-[a-z-]+|language-[\w+#.-]+)$/];

/** @type {import('hast-util-sanitize').Schema} */
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...defaultSchema.attributes.a, 'target', 'rel'],
    img: [...defaultSchema.attributes.img, 'loading', 'decoding'],
    pre: [shikiClass, 'style', 'dataLanguage'],
    code: [...defaultSchema.attributes.code, shikiClass, 'style'],
    span: [shikiClass, 'style'],
    th: ['align'],
    td: ['align']
  }
};
