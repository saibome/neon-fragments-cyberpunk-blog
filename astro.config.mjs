import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import rehypeSanitize from 'rehype-sanitize';
import { resolveSiteUrl } from './scripts/env.mjs';
import { sanitizeSchema } from './scripts/markdown-config.mjs';

/** 静态站点在构建期固化域名；注入 process.env 让页面与端点读到同一个值 */
const siteUrl = resolveSiteUrl();
if (!process.env.SITE_URL) process.env.SITE_URL = siteUrl;

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory'
  },
  markdown: {
    // 正文由官方 render(entry) 渲染；用官方 Unified 处理器挂载 rehype-sanitize，
    // 保留站点一直以来的白名单消毒。代码高亮使用 Astro 默认的 Shiki。
    processor: unified({
      rehypePlugins: [[rehypeSanitize, sanitizeSchema]]
    })
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
