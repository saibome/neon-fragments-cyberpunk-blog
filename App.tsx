import React from 'react';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './AppRoutes';
import { AppProviders } from './components/AppProviders';
import type { InitialData } from './types';

export default function App({ initialData }: { initialData: InitialData }) {
  return (
    <AppProviders initialData={initialData}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
