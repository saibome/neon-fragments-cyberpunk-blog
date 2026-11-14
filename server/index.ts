/// <reference types="vite/client" />
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '../entry-server';
import app, { getPostList } from './app';
import type { InitialData } from '../types';
// @ts-ignore
// import template from '../index.html?raw';
// import posts from '../services/posts.json';

const postsPath = path.resolve(process.cwd(), 'services', 'posts.json');
let posts: any[] = [];

try {
  const data = fs.readFileSync(postsPath, 'utf-8');
  posts = JSON.parse(data);
} catch (error) {
  console.warn('Failed to load posts from services/posts.json', error);
  posts = [];
}

const server = new Hono();

if (import.meta.env.PROD) {
  server.use('/*', serveStatic({ root: './dist/client' }));
}

server.route('/', app);

server.get('*', async (c) => {
  const url = new URL(c.req.url);
  const pathName = url.pathname;
  const initialData: InitialData = { posts: [] };
  const postMatch = pathName.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  let foundPost = false;

  if (pathName === '/') {
    initialData.list = getPostList(url.searchParams);
  } else if (postMatch) {
    const slug = postMatch[4];
    initialData.resolvedSlug = slug;
    const index = posts.findIndex((p) => p.slug === slug);
    if (index !== -1) {
      foundPost = true;
      const post = posts[index];
      const newerPost = index > 0 ? posts[index - 1] : null;
      const olderPost = index < posts.length - 1 ? posts[index + 1] : null;
      initialData.posts = [{
        ...post,
        next: newerPost ? { slug: newerPost.slug, title: newerPost.title, date: newerPost.date } : undefined,
        previous: olderPost ? { slug: olderPost.slug, title: olderPost.title, date: olderPost.date } : undefined
      }];
    }
  }

  const knownPage = pathName === '/' || pathName === '/net' || pathName === '/data' || pathName === '/gear';
  const status: 200 | 404 = knownPage || foundPost ? 200 : 404;
  const { html: appHtml, helmetContext } = await render(`${pathName}${url.search}`, initialData);
  const { helmet } = helmetContext as any;

  let template = '';
  if (import.meta.env.PROD) {
    try {
      template = fs.readFileSync(path.resolve('dist/client/index.html.template'), 'utf-8');
    } catch (e) {
      console.error("Could not read dist/client/index.html.template");
      return c.text("服务器错误：缺少客户端构建产物", 500);
    }
  } else {
    try {
      template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
    } catch (e) {
      console.error("Could not read index.html");
      return c.text("服务器错误：缺少 index.html", 500);
    }
  }

  const serializedData = JSON.stringify(initialData).replace(/</g, '\\u003c');
  let html = template
    .replace('<!--app-html-->', appHtml)
    .replace('<!--initial-data-->', `<script>window.__INITIAL_DATA__ = ${serializedData}</script>`);

  if (helmet) {
    const helmetHead = `
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
    `;
    html = html.replace('</head>', `${helmetHead}</head>`);
  }

  // @ts-ignore
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
  console.log(`Server is running on port ${port}`);
  serve({
    fetch: server.fetch,
    hostname: '0.0.0.0',
    port
  });
}

export default server;
