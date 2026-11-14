import React, { createContext, useContext } from 'react';
import { BlogPost, InitialData, PostListResult } from '../types';

interface DataContextType {
  posts: BlogPost[];
  initialList?: PostListResult;
  resolvedSlug?: string;
}

const DataContext = createContext<DataContextType>({ posts: [] });

export const DataProvider: React.FC<{ children: React.ReactNode; initialData: InitialData }> = ({ children, initialData }) => {
  return (
    <DataContext.Provider value={{
      posts: initialData.posts,
      initialList: initialData.list,
      resolvedSlug: initialData.resolvedSlug
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
