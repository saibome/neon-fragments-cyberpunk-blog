import React from 'react';
import { BrowserRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AppRoutes } from './AppRoutes';
import { DataProvider } from './contexts/DataContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { InitialData } from './types';

interface AppProps {
  initialData?: InitialData;
}

function App({ initialData = { posts: [] } }: AppProps) {
  return (
    <DataProvider initialData={initialData}>
      <ProfileProvider>
        <HelmetProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </HelmetProvider>
      </ProfileProvider>
    </DataProvider>
  );
}

export default App;
