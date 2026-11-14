import React from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import NetPage from './components/NetPage';
import GearPage from './components/GearPage';
import NotFound from './components/NotFound';
import GlitchText from './components/GlitchText';

const GenericPage: React.FC<{ title: string }> = ({ title }) => (
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

/**
 * 页面组件同步导入，服务端与浏览器渲染完全相同的组件树。
 * 使用 React.lazy 会让 hydrate 首帧落到 Suspense fallback，替换掉 SSR 内容。
 */
export function AppRoutes() {
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
