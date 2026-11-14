import React, { useEffect, useState } from 'react';
import CyberTagGrid from './CyberTagGrid';
import GlitchText from './GlitchText';
import { useProfile } from '../contexts/ProfileContext';

interface Tag {
  tag: string;
  count: number;
}

const NetPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { resetProfile } = useProfile();

  useEffect(() => {
    resetProfile();
  }, [resetProfile]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const data = await res.json();
          setTags(data);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 md:p-8 flex flex-col items-center">
      <div className="text-center mb-8 w-full max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tighter">
          <GlitchText text="网络" />
        </h1>
        <div className="h-1 w-24 bg-cyber-yellow mx-auto mb-4"></div>
        <p className="text-cyber-cyan font-mono text-sm md:text-base tracking-widest">
          全局数据聚合 // 标签矩阵
        </p>
      </div>

      <div className="w-full flex-grow flex flex-col items-center justify-start relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none fixed"></div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 border-4 border-cyber-yellow border-t-transparent rounded-full animate-spin"></div>
            <div className="text-cyber-yellow font-mono animate-pulse">正在建立连接……</div>
          </div>
        ) : (
          <CyberTagGrid tags={tags} />
        )}
      </div>
    </div>
  );
};

export default NetPage;
