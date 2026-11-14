import React from 'react';
import { Link } from 'react-router';
import { NavItem } from '../types';
import { NAV_ITEMS } from '../constants';
import GlitchText from './GlitchText';

interface NavbarProps {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
  onToggleProfile?: () => void;
  isProfileOpen?: boolean;
  desktopSidebar?: React.ReactNode;
}

const CyberMenuIcon = ({ className, isOpen }: { className?: string, isOpen?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top Line */}
    <path
      d="M2 6H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={`transition-all duration-300 origin-center ${isOpen ? 'translate-y-[6px] rotate-45' : ''}`}
      style={{ transformBox: 'fill-box' }}
    />

    {/* Middle Lines */}
    <path
      d="M2 12H16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={`transition-all duration-300 ${isOpen ? 'opacity-0 -translate-x-4' : 'opacity-100'}`}
    />
    <path
      d="M19 12H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={`transition-all duration-300 ${isOpen ? 'opacity-0 translate-x-4' : 'opacity-100'}`}
    />

    {/* Bottom Line */}
    <path
      d="M2 18H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className={`transition-all duration-300 origin-center ${isOpen ? '-translate-y-[6px] -rotate-45' : ''}`}
      style={{ transformBox: 'fill-box' }}
    />

    {/* Decorative Rects */}
    <rect
      x="20" y="4" width="2" height="4"
      fill="currentColor"
      className={`transition-all duration-300 ${isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
    />
    <rect
      x="2" y="16" width="2" height="4"
      fill="currentColor"
      className={`transition-all duration-300 ${isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
    />
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({ activeItem, onNavigate, onToggleProfile, isProfileOpen, desktopSidebar }) => {
  return (
    <nav className="fixed top-0 z-50 w-full bg-cyber-black/90 backdrop-blur-sm border-b border-cyber-gray/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Mobile Profile Toggle */}
            <button
              className="md:hidden mr-4 text-cyber-yellow hover:text-cyber-cyan transition-colors z-50 relative"
              onClick={onToggleProfile}
              aria-label="切换个人资料"
            >
              <CyberMenuIcon className="w-8 h-8" isOpen={isProfileOpen} />
            </button>

            <Link to="/" className="flex-shrink-0 cursor-pointer">
              <h1 className="text-3xl font-display font-bold italic tracking-tighter text-cyber-yellow">
                <span className="text-cyber-cyan mr-1">NC</span>
                SAIBO<span className="text-white">.</span>ME
              </h1>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium font-mono transition-colors duration-200
                      ${isActive ? 'text-cyber-yellow bg-cyber-gray/30 border-b-2 border-cyber-yellow' : 'text-gray-400 hover:text-cyber-cyan'}
                    `}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${isActive ? 'animate-pulse' : 'group-hover:text-cyber-red'}`} />
                    <GlitchText text={item.label} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center">
             <div className="h-2 w-2 bg-green-500 rounded-full animate-ping mr-2"></div>
             <span className="text-xs font-mono text-green-500">在线</span>
          </div>
        </div>
      </div>
      {/* Decorative Scanline under nav */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-50"></div>

      {/* Desktop Sidebar - Fixed relative to container */}
      {desktopSidebar && (
        <div className="hidden lg:block absolute top-16 left-0 w-full h-0 pointer-events-none">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full relative">
              <div className="absolute top-0 left-4 sm:left-6 lg:left-8 w-80 h-[calc(100vh-4rem)] overflow-y-auto pt-6 pb-6 pointer-events-auto no-scrollbar">
                 {desktopSidebar}
              </div>
           </div>
        </div>
      )}
    </nav>
  );
};export default Navbar;
