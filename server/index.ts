/// <reference types="vite/client" />
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '../entry-server';
import app from './app';
import { SITE_URL } from './site';
import { posts, getPostDetail } from './posts';
import { listPosts } from '../lib/postList';
import type { InitialData } from '../types';

const server = new Hono();
const KNOWN_PAGES = new Set(['/', '/net', '/data', '/gear']);

if (import.meta.env.PROD) {
  server.use('/*', serveStatic({ root: './dist/client' }));
}

server.route('/', app);

server.get('*', async (c) => {
  const url = new URL(c.req.url);
  const pathName = url.pathname;

  // 静态托管的入口文件请求统一回到 SSR 首页
  if (pathName === '/index.html') {
    return c.redirect(`/${url.search}`, 301);
  }

  // API 的未知路径返回 JSON，而不是渲染一整页 404 HTML
  if (pathName.startsWith('/api/')) {
    return c.json({ error: '接口不存在' }, 404);
  }

  const initialData: InitialData = { posts: [], siteUrl: SITE_URL };
  let foundPost = false;

  if (pathName === '/') {
    initialData.list = listPosts(posts, url.searchParams);
  } else {
    const postMatch = pathName.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
    if (postMatch) {
      const [, year, month, day, slug] = postMatch;
      initialData.resolvedSlug = slug;
      const detail = getPostDetail(slug);
      if (detail) {
        const requested = `/${year}/${month}/${day}/${slug}`;
        if (requested !== detail.permalink) {
          return c.redirect(`${detail.permalink}${url.search}`, 301);
        }
        foundPost = true;
        initialData.posts = [detail];
      }
    }
  }

  const status: 200 | 404 = KNOWN_PAGES.has(pathName) || foundPost ? 200 : 404;
  const { html: appHtml, helmetContext } = render(`${pathName}${url.search}`, initialData);
  const helmet = helmetContext.helmet;

  const templatePath = import.meta.env.PROD
    ? path.resolve('dist/template/index.html')
    : path.resolve('index.html');

  let template: string;
  try {
    template = fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`无法读取 HTML 模板 ${templatePath}`, error);
    return c.text('服务器错误：缺少 HTML 模板', 500);
  }

  const serializedData = JSON.stringify(initialData).replace(/</g, '\\u003c');
  let html = template
    .replace('<!--app-html-->', appHtml)
    .replace('<!--initial-data-->', serializedData);

  if (helmet) {
    const helmetHead = `
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
    `;
    html = html.replace('</head>', `${helmetHead}</head>`);
  }

  if (import.meta.env.DEV) {
    html = html.replace(
      '<head>',
      `<head>
    <script type="module">
      import RefreshRuntime from "/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`
    );
  }

  return c.html(html, status);
});

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT) || 3000;
  console.log(`Server is running on port ${port} (${SITE_URL})`);
  serve({
    fetch: server.fetch,
    hostname: '0.0.0.0',
    port
  });
}

export default server;
