import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import type { HelmetServerState } from 'react-helmet-async';
import { AppRoutes } from './AppRoutes';
import { AppProviders } from './components/AppProviders';
import type { InitialData } from './types';

export interface HelmetRenderContext {
  helmet?: HelmetServerState;
}

export function render(url: string, initialData: InitialData) {
  const helmetContext: HelmetRenderContext = {};
  const html = renderToString(
    <AppProviders initialData={initialData} helmetContext={helmetContext}>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AppProviders>
  );

  return { html, helmetContext };
}
