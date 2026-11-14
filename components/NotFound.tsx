import React from 'react';
import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle } from 'lucide-react';
import GlitchText from './GlitchText';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <Helmet>
        <title>页面不存在 | 霓虹碎片</title>
        <meta name="description" content="请求的数据碎片不存在或已经损坏。" />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <div className="relative mb-8">
        <AlertTriangle className="w-24 h-24 text-cyber-red animate-pulse" />
        <div className="absolute inset-0 bg-cyber-red blur-xl opacity-20 animate-pulse"></div>
      </div>

      <h1 className="text-6xl md:text-8xl font-display font-bold text-white mb-4 tracking-tighter">
        <GlitchText text="404" />
      </h1>

      <h2 className="text-xl md:text-2xl font-mono text-cyber-yellow mb-8 uppercase tracking-widest">
        未找到数据碎片
      </h2>

      <p className="text-gray-400 max-w-md mb-8 font-mono text-sm">
        未能在子网中找到请求的节点。它可能已被 NetWatch 清除，或因数据腐化而损坏。
      </p>

      <Link
        to="/"
        className="px-8 py-3 bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan font-bold font-mono hover:bg-cyber-cyan hover:text-black transition-all duration-300 uppercase tracking-wider clip-corner"
      >
        返回首页
      </Link>
    </div>
  );
};

export default NotFound;
