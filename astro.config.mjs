import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { resolveSiteUrl } from './scripts/env.mjs';

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
  // 正文由官方 render(entry) 渲染；不显式配置 markdown.processor，
  // 使用 Astro 7 默认的 Rust 实现 Sätteri 处理器（Shiki 高亮 + 图片优化均为默认行为）。
  // 内容全部来自本地 Obsidian 库，属可信来源，不再挂载 rehype-sanitize。
  vite: {
    plugins: [tailwindcss()]
  }
});
