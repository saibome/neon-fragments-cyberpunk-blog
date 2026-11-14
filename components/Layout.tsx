import React, { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import Navbar from './Navbar';
import ProfileSidebar from './ProfileSidebar';
import { NAV_ITEMS } from '../constants';
import { NavItem } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useData } from '../contexts/DataContext';
import { BASE_URL } from '../constants';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: '霓虹碎片 | NEON FRAGMENTS',
    description: '记录代码、设计、装备与夜之城灵感的赛博朋克博客。'
  },
  '/net': {
    title: '网络 | 霓虹碎片',
    description: '浏览霓虹碎片的全部文章标签，按主题检索代码、设计与城市观察。'
  },
  '/data': {
    title: '数据档案 | 霓虹碎片',
    description: '霓虹碎片的数据档案区域，正在整理更多内容与索引。'
  },
  '/gear': {
    title: '技术装备 | 霓虹碎片',
    description: '霓虹碎片博客使用的技术栈、构建工具与界面组件。'
  }
};

const Layout: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { initialList } = useData();
  const [stats, setStats] = useState({ postCount: initialList?.total || 0, tagCount: 0 });
  const { user } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [postsRes, tagsRes] = await Promise.all([
          initialList ? Promise.resolve(null) : fetch('/api/posts?limit=1'),
          fetch('/api/tags')
        ]);

        if (tagsRes.ok) {
          const postsData = postsRes?.ok ? await postsRes.json() : null;
          const tagsData = await tagsRes.json();
          setStats({
            postCount: initialList?.total ?? postsData?.total ?? 0,
            tagCount: tagsData.length
          });
        }
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      }
    };
    fetchStats();
  }, [initialList]);

  // Determine active nav item based on path
  const activeNav = NAV_ITEMS.find(item => item.path === location.pathname)?.id || NavItem.HOME;
  const meta = PAGE_META[location.pathname] || PAGE_META['/'];
  const canonicalUrl = `${BASE_URL}${location.pathname}`;

  const handleNav = (item: NavItem) => {
    const navItem = NAV_ITEMS.find(n => n.id === item);
    if (navItem) {
      navigate(navItem.path);
      setIsProfileOpen(false);
    }
  };

  const sidebarContent = (
    <>
      <ProfileSidebar
        user={user}
        activeItem={activeNav}
        onNavigate={handleNav}
      />

      {/* Decorative Sidebar Elements */}
      <div className="mt-6 hidden lg:block">
        <div className="border border-gray-800 p-4 bg-black/40">
          <h4 className="text-cyber-red font-mono text-xs font-bold mb-2">系统状态</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>防火墙</span>
              <span className="text-green-500">已启用</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>路由追踪</span>
              <span className="text-red-500">已阻断</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>数据碎片</span>
              <span className="text-cyber-cyan">{stats.postCount}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>索引节点</span>
              <span className="text-cyber-yellow">{stats.tagCount}</span>
            </div>
            <div className="w-full bg-gray-900 h-1 mt-2">
              <div className="bg-cyber-yellow h-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" type="application/rss+xml" title="霓虹碎片 RSS" href={`${BASE_URL}/rss.xml`} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="霓虹碎片" />
        <meta property="og:locale" content="zh_CN" />
      </Helmet>
      <div className="min-h-screen flex flex-col font-sans text-gray-100 selection:bg-cyber-yellow selection:text-black">
      <Navbar
        activeItem={activeNav}
        onNavigate={handleNav}
        onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
        isProfileOpen={isProfileOpen}
        desktopSidebar={sidebarContent}
      />

      <main className="flex-grow container mx-auto max-w-7xl w-full px-0 sm:px-6 lg:px-8 py-2 md:py-6 mt-16">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Sidebar - Drawer on Mobile */}
          <aside className={`
            fixed inset-0 z-40 bg-black pt-24 px-6 pb-6 overflow-y-auto transition-transform duration-300 ease-in-out lg:hidden
            ${isProfileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
             <ProfileSidebar
                user={user}
                activeItem={activeNav}
                onNavigate={handleNav}
             />
          </aside>

          {/* Placeholder for Desktop Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0"></div>

          {/* Overlay for mobile when open */}

          {/* Overlay for mobile when open */}
          {isProfileOpen && (
            <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                onClick={() => setIsProfileOpen(false)}
            />
          )}

          {/* Main Content Area */}
          <section className="flex-grow min-w-0">
            <Suspense fallback={<div className="py-20 text-center text-cyber-yellow font-mono" role="status">正在接入数据流……</div>}>
              <Outlet />
            </Suspense>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-gray-600 font-mono text-xs">
             © 2077 SAIBO.ME // 保留所有权利 
           </p>
           <div className="mt-2 text-[10px] text-gray-700 uppercase tracking-[0.2em]">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="hover:text-gray-500 transition-colors"
            >
              粤ICP备2026121562号-2
            </a>
            {' '}// 安全连接
           </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default Layout;
