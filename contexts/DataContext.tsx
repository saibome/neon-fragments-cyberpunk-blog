import React, { createContext, useContext } from 'react';
import { DEFAULT_SITE_URL, normalizeSiteUrl } from '../config';
import type { BlogPost, InitialData, PostListResult } from '../types';

interface DataContextType {
  posts: BlogPost[];
  initialList?: PostListResult;
  resolvedSlug?: string;
  siteUrl: string;
}

const DataContext = createContext<DataContextType>({ posts: [], siteUrl: DEFAULT_SITE_URL });

export const DataProvider: React.FC<{ children: React.ReactNode; initialData: InitialData }> = ({ children, initialData }) => {
  return (
    <DataContext.Provider value={{
      posts: initialData.posts,
      initialList: initialData.list,
      resolvedSlug: initialData.resolvedSlug,
      siteUrl: normalizeSiteUrl(initialData.siteUrl)
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
