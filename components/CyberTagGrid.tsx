import React, { useState } from 'react';
import { Link } from 'react-router';
import GlitchText from './GlitchText';

interface Tag {
  tag: string;
  count: number;
}

interface CyberTagGridProps {
  tags: Tag[];
}

const CyberTagGrid: React.FC<CyberTagGridProps> = ({ tags }) => {
  // Sort by count descending to emphasize important topics
  const sortedTags = [...tags].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...tags.map(t => t.count), 1);

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex flex-wrap justify-center gap-3 md:gap-4">
        {sortedTags.map((tag, index) => (
          <TagItem key={tag.tag} tag={tag} index={index} maxCount={maxCount} />
        ))}
      </div>
    </div>
  );
};

const TagItem: React.FC<{ tag: Tag; index: number; maxCount: number }> = ({ tag, maxCount }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate relative importance (0 to 1)
  const importance = tag.count / maxCount;

  // Dynamic size classes based on relative importance
  let sizeClass = 'text-sm md:text-base'; // Default/Low
  if (importance > 0.8) sizeClass = 'text-xl md:text-2xl font-bold';
  else if (importance > 0.6) sizeClass = 'text-lg md:text-xl font-semibold';
  else if (importance > 0.4) sizeClass = 'text-base md:text-lg';

  const opacityClass = tag.count > 0 ? 'opacity-100' : 'opacity-80';
  return (
    <Link
      to={`/?tag=${encodeURIComponent(tag.tag)}&page=1`}
      className={`
        relative group inline-flex items-center justify-center
        px-4 py-2 md:px-6 md:py-3
        bg-black/60 border border-cyber-cyan/30
        hover:border-cyber-yellow hover:bg-cyber-yellow/10
        transition-all duration-200 ease-out
        ${sizeClass} ${opacityClass}
        cursor-pointer
      `}
      style={{
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative corner markers */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-cyan group-hover:border-cyber-yellow transition-colors duration-300" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-cyan group-hover:border-cyber-yellow transition-colors duration-300" />

      {/* Background scanline effect on hover */}
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-yellow/5 to-transparent translate-y-[-100%] group-hover:animate-scanline pointer-events-none" />

      <span className="font-mono text-cyber-cyan group-hover:text-cyber-yellow transition-colors relative z-10 tracking-wider flex items-center">
        <span className={`mr-1 inline-block transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>&gt;</span>
        <GlitchText text={tag.tag} />
      </span>

      <span className="ml-3 text-xs font-mono text-gray-600 group-hover:text-cyber-yellow/70 transition-colors">
        {tag.count.toString().padStart(2, '0')}
      </span>
    </Link>
  );
};

export default CyberTagGrid;
