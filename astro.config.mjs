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
  vite: {
    plugins: [tailwindcss()]
  }
});
