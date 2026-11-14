import React from 'react';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { DataProvider } from '../contexts/DataContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import type { InitialData } from '../types';

interface AppProvidersProps {
  children: React.ReactNode;
  initialData: InitialData;
  /** 仅 SSR 需要传入，用于把 helmet 生成的 head 标签注入模板 */
  helmetContext?: { helmet?: HelmetServerState };
}

/** 服务端与浏览器共用同一套 Provider 顺序，避免 hydration 时上下文结构不一致 */
export function AppProviders({ children, initialData, helmetContext }: AppProvidersProps) {
  return (
    <DataProvider initialData={initialData}>
      <ProfileProvider>
        <HelmetProvider context={helmetContext}>
          {children}
        </HelmetProvider>
      </ProfileProvider>
    </DataProvider>
  );
}
