import React, { useState } from 'react';
import GlitchText from './GlitchText';

const techStack = [
  {
    name: 'React',
    type: '界面库',
    description: '基于组件的界面渲染引擎，当前使用 React 19，服务端与浏览器共用同一棵组件树。',
    stats: { performance: 95, stability: 98, complexity: 85 },
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    bgColor: 'bg-cyan-400',
    shadowColor: 'shadow-cyan-400/50'
  },
  {
    name: 'Vite',
    type: '构建工具',
    description: 'Vite 8 前端工具链，分别产出客户端资源与 SSR 服务端包，开发期提供 HMR。',
    stats: { speed: 99, efficiency: 95, bundleSize: 90 },
    color: 'text-purple-400',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-400',
    shadowColor: 'shadow-purple-400/50'
  },
  {
    name: 'Hono',
    type: '服务端',
    description: '运行在 Node.js 26 上的轻量 Web 框架，负责 SSR、API、订阅源与分享卡片。',
    stats: { latency: 10, throughput: 98, footprint: 5 },
    color: 'text-orange-400',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-400',
    shadowColor: 'shadow-orange-400/50'
  },
  {
    name: 'React Router',
    type: '导航',
    description: 'React Router 8 提供声明式路由，首屏服务端渲染、后续点击客户端接管。',
    stats: { flexibility: 90, integration: 95, ux: 92 },
    color: 'text-red-500',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-500',
    shadowColor: 'shadow-red-500/50'
  },
  {
    name: 'Tailwind CSS',
    type: '样式',
    description: 'Tailwind CSS 4 工具类样式，通过 Vite 插件按需生成。',
    stats: { customization: 98, size: 95, maintenance: 90 },
    color: 'text-sky-400',
    borderColor: 'border-sky-400',
    bgColor: 'bg-sky-400',
    shadowColor: 'shadow-sky-400/50'
  },
  {
    name: 'Markdown',
    type: '内容引擎',
    description: '构建期把 Markdown 编译为 JSON，含代码高亮、frontmatter 校验与 HTML 消毒。',
    stats: { speed: 96, safety: 99, maintenance: 92 },
    color: 'text-blue-400',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-400',
    shadowColor: 'shadow-blue-400/50'
  }
];

const statLabels: Record<string, string> = {
  performance: '性能',
  stability: '稳定性',
  complexity: '复杂度',
  speed: '速度',
  efficiency: '效率',
  bundleSize: '打包体积',
  latency: '延迟',
  throughput: '吞吐量',
  footprint: '资源占用',
  flexibility: '灵活性',
  integration: '集成度',
  ux: '用户体验',
  customization: '可定制性',
  size: '体积',
  maintenance: '可维护性',
  safety: '安全性'
};

const GlitchCard: React.FC<{ tech: typeof techStack[0] }> = ({ tech }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute inset-0 ${tech.borderColor} border bg-transparent translate-x-1 translate-y-1 opacity-0 group-hover:opacity-70 transition-opacity duration-75 pointer-events-none z-0 mix-blend-screen`}></div>
      <div className={`absolute inset-0 ${tech.borderColor} border bg-transparent -translate-x-1 -translate-y-1 opacity-0 group-hover:opacity-70 transition-opacity duration-75 pointer-events-none z-0 mix-blend-multiply`}></div>

      <div className={`relative z-10 h-full bg-black/80 border ${tech.borderColor} p-6 overflow-hidden transition-all duration-200 ${isHovered ? 'translate-x-[-2px] translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]' : ''}`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_100%)] bg-[size:4px_4px]"></div>

        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${tech.borderColor} transition-all duration-300 ${isHovered ? 'w-full h-full opacity-20' : ''}`}></div>
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${tech.borderColor} transition-all duration-300 ${isHovered ? 'w-full h-full opacity-20' : ''}`}></div>

        <div className="flex justify-between items-start mb-4 relative">
          <h2 className={`text-3xl font-display font-bold ${tech.color} tracking-tighter uppercase group-hover:animate-pulse`}>
            {isHovered ? <GlitchText text={tech.name} /> : tech.name}
          </h2>
          <span className="text-[10px] font-mono bg-white/5 px-2 py-1 text-gray-400 border border-white/10 tracking-widest">
            {tech.type}
          </span>
        </div>

        <div className="relative mb-6">
          <div className={`absolute -left-6 top-0 bottom-0 w-1 ${tech.bgColor} opacity-50`}></div>
          <p className="text-gray-400 font-mono text-sm leading-relaxed pl-2">
            {tech.description}
          </p>
        </div>

        <div className="space-y-4 mt-auto">
          {Object.entries(tech.stats).map(([key, value]) => (
            <div key={key} className="group/stat">
              <div className="flex justify-between text-[10px] font-mono uppercase text-gray-500 mb-1 tracking-wider">
                <span>{statLabels[key]}</span>
                <span className={`${tech.color}`}>{value}%</span>
              </div>
              <div className="h-2 bg-gray-900 w-full relative overflow-hidden border border-gray-800">
                <div
                  className={`absolute top-0 left-0 h-full ${tech.bgColor} transition-all duration-1000 ease-out group-hover:w-full`}
                  style={{ width: `${isHovered ? 100 : value}%`, opacity: 0.8 }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,transparent_50%,rgba(0,0,0,0.5)_50%,rgba(0,0,0,0.5)_100%)] bg-[size:4px_4px] opacity-30"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 right-2 text-[8px] font-mono text-gray-600 opacity-50">
          编号：{Array.from(tech.name).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0).toString(36).substring(0, 6).toUpperCase().padStart(6, '0')}
        </div>
      </div>
    </div>
  );
};

const GearPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-100px)] p-4 md:p-8 text-white flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-cyber-cyan/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyber-red/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="text-center mb-8 w-full max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tighter">
            <GlitchText text="技术装备" />
          </h1>
          <div className="h-1 w-24 bg-cyber-yellow mx-auto mb-4"></div>
          <p className="text-cyber-cyan font-mono text-sm md:text-base tracking-widest">
            系统完整性 // 100%
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {techStack.map((tech) => (
            <GlitchCard key={tech.name} tech={tech} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GearPage;
