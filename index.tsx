import React from 'react';
import ReactDOM from 'react-dom/client';
import 'highlight.js/styles/atom-one-dark.css';
import './index.css';
import App from './App';
import { normalizeSiteUrl } from './config';
import type { InitialData } from './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const raw = document.getElementById('__INITIAL_DATA__')?.textContent;
let parsed: Partial<InitialData> = {};
try {
  parsed = raw ? JSON.parse(raw) as Partial<InitialData> : {};
} catch (error) {
  console.error('首屏数据解析失败，将回退到客户端加载', error);
}

const initialData: InitialData = {
  posts: parsed.posts ?? [],
  list: parsed.list,
  resolvedSlug: parsed.resolvedSlug,
  siteUrl: normalizeSiteUrl(parsed.siteUrl)
};

ReactDOM.hydrateRoot(rootElement,
  <React.StrictMode>
    <App initialData={initialData} />
  </React.StrictMode>
);
