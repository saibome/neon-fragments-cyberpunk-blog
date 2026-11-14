import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AppRoutes } from './AppRoutes';
import { DataProvider } from './contexts/DataContext';
import { ProfileProvider } from './contexts/ProfileContext';
import PostDetail from './components/PostDetail';
import NetPage from './components/NetPage';
import GearPage from './components/GearPage';
import { InitialData } from './types';

const serverPages = { PostDetail, NetPage, GearPage };

export function render(url: string, initialData: InitialData) {
  const helmetContext = {};
  const html = renderToString(
    <DataProvider initialData={initialData}>
      <ProfileProvider>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={url}>
            <AppRoutes pages={serverPages} />
          </StaticRouter>
        </HelmetProvider>
      </ProfileProvider>
    </DataProvider>
  );

  return { html, helmetContext };
}
