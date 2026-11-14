import React, { useEffect, useRef } from 'react';
import { UserProfile, NavItem } from '../types';
import { Shield, Cpu, Wifi, Battery } from 'lucide-react';
import * as d3 from 'd3';
import { NAV_ITEMS } from '../constants';
import GlitchText from './GlitchText';

interface ProfileSidebarProps {
  user: UserProfile;
  activeItem?: NavItem;
  onNavigate?: (item: NavItem) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ user, activeItem, onNavigate }) => {
  const d3Container = useRef<SVGSVGElement>(null);

  // D3 Visualization for "Brain Activity"
  useEffect(() => {
    if (d3Container.current) {
      const svg = d3.select(d3Container.current);
      svg.selectAll("*").remove(); // Clear previous

      const width = 200;
      const height = 60;
      const n = 40;
      const data = new Array(n).fill(0).map(() => Math.random());

      const x = d3.scaleLinear().domain([0, n - 1]).range([0, width]);
      const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

      const line = d3.line<number>()
        .x((d, i) => x(i))
        .y((d) => y(d))
        .curve(d3.curveBasis);

      const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#00f0ff")
        .attr("stroke-width", 1.5)
        .attr("d", line);

      // Animate the line to look like brain waves
      const tick = () => {
        // Shift data
        data.push(Math.random());
        data.shift();
        path.datum(data).attr("d", line);
      };

      const timer = d3.interval(tick, 100);
      return () => timer.stop();
    }
  }, []);

  return (
    <div className="bg-cyber-black border border-cyber-gray/50 p-6 clip-corner-tr relative overflow-hidden flex flex-col">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.8)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0 opacity-50"></div>

      <div className="relative z-10">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-cyber-yellow clip-both flex items-center justify-center overflow-hidden border-2 border-white">
             <img src="https://picsum.photos/200/200" alt="头像" className="w-full h-full object-cover mix-blend-multiply grayscale contrast-125" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-white leading-none">{user.name}</h2>
            {user.handle_link ? (
              <a href={user.handle_link} target="_blank" rel="noopener noreferrer" className="block text-cyber-yellow font-mono text-sm hover:underline hover:text-cyber-cyan transition-colors">
                {user.handle}
              </a>
            ) : (
              <div className="block text-cyber-yellow font-mono text-sm">{user.handle}</div>
            )}
            <div className="flex space-x-2 mt-1">
              <span className="inline-block bg-cyber-red text-black text-[10px] px-1 font-bold">等级 {user.level}</span>
              <span className="inline-block border border-cyber-cyan text-cyber-cyan text-[10px] px-1 font-bold uppercase">{user.role}</span>
            </div>
          </div>
        </div>



        <div className="mb-6">
          <p className="text-gray-400 text-sm font-mono leading-relaxed border-l-2 border-cyber-cyan pl-3 italic">
            "{user.bio}"
          </p>
        </div>

        <div className="space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="flex items-center text-gray-400 w-20"><Cpu className="w-3 h-3 mr-2" /> RAM</span>
            <div className="w-32 h-2 bg-gray-800 rounded-none overflow-hidden">
              <div className="h-full bg-cyber-yellow" style={{ width: `${user.stats.ram}%` }}></div>
            </div>
            <span className="text-cyber-yellow w-12 text-right">{user.stats.ram}%</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center text-gray-400 w-20"><Shield className="w-3 h-3 mr-2" /> ICE</span>
            <div className="w-32 h-2 bg-gray-800 rounded-none overflow-hidden">
              <div className="h-full bg-cyber-red" style={{ width: `${user.stats.cpu}%` }}></div>
            </div>
            <span className="text-cyber-red w-12 text-right">{user.stats.cpu}%</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center text-gray-400 w-20"><Wifi className="w-3 h-3 mr-2" /> 上行链路</span>
             <div className="w-32 h-2 bg-gray-800 rounded-none overflow-hidden">
              <div className="h-full bg-cyber-cyan" style={{ width: `${user.stats.network}%` }}></div>
            </div>
            <span className="text-cyber-cyan w-12 text-right">{user.stats.network}MS</span>
          </div>
        </div>

        <div className="mt-8 border-t border-cyber-gray pt-4 hidden md:block">
          <h3 className="text-cyber-cyan font-bold mb-2 text-sm uppercase tracking-widest">神经活动</h3>
          <svg ref={d3Container} width="200" height="60" className="w-full overflow-visible"></svg>
        </div>
      </div>



      {/* Mobile Navigation */}
      <div className="md:hidden mt-6 border-t border-cyber-gray/50 pt-4 relative z-10 -mx-6">
        <h3 className="text-cyber-cyan font-bold mb-4 text-sm uppercase tracking-widest px-6">导航</h3>
        <div className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`
                  w-full group flex items-center px-6 py-3 text-sm font-medium font-mono transition-colors duration-200 border-l-2 border-transparent
                  ${isActive
                    ? 'text-cyber-yellow bg-cyber-gray/30 border-l-cyber-yellow'
                    : 'text-gray-400 hover:text-cyber-cyan hover:bg-cyber-gray/10 hover:border-l-cyber-cyan/30'}
                `}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'animate-pulse' : 'group-hover:text-cyber-red'}`} />
                <GlitchText text={item.label} />
                {isActive && <div className="ml-auto w-2 h-2 bg-cyber-yellow rounded-full animate-ping" />}
              </button>
            );
          })}
        </div>
      </div>      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 p-2">
         <div className="w-2 h-2 bg-cyber-red"></div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
