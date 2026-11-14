import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import PostList from './components/PostList';
import NotFound from './components/NotFound';
import GlitchText from './components/GlitchText';
import { useProfile } from './contexts/ProfileContext';

interface RoutePages {
  PostDetail: React.ComponentType;
  NetPage: React.ComponentType;
  GearPage: React.ComponentType;
}

const clientPages: RoutePages = {
  PostDetail: React.lazy(() => import('./components/PostDetail')),
  NetPage: React.lazy(() => import('./components/NetPage')),
  GearPage: React.lazy(() => import('./components/GearPage'))
};

const GenericPage: React.FC<{ title: string }> = ({ title }) => {
  const { resetProfile } = useProfile();

  useEffect(() => {
    resetProfile();
  }, [resetProfile]);

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 md:p-8 flex flex-col items-center">
      <div className="text-center mb-8 w-full max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tighter">
          <GlitchText text={title} />
        </h1>
        <div className="h-1 w-24 bg-cyber-yellow mx-auto mb-4"></div>
        <p className="text-cyber-cyan font-mono text-sm md:text-base tracking-widest">
          系统消息 // 本区域建设中
        </p>
      </div>
    </div>
  );
};

export function AppRoutes({ pages = clientPages }: { pages?: RoutePages }) {
  const { PostDetail, NetPage, GearPage } = pages;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PostList />} />
        <Route path="net" element={<NetPage />} />
        <Route path="data" element={<GenericPage title="数据档案" />} />
        <Route path="gear" element={<GearPage />} />
        <Route path=":year/:month/:day/:slug" element={<PostDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
