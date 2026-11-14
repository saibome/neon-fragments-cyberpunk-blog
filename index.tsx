import React from 'react';
import ReactDOM from 'react-dom/client';
import 'highlight.js/styles/atom-one-dark.css';
import './index.css';
import App from './App';
import { InitialData } from './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// @ts-ignore
const initialData = window.__INITIAL_DATA__ as InitialData || { posts: [] };

ReactDOM.hydrateRoot(rootElement,
  <React.StrictMode>
    <App initialData={initialData} />
  </React.StrictMode>
);
