import { Terminal, Radio, Settings, FolderOpen } from 'lucide-react';
import { NavItem } from './types';

export { DEFAULT_AUTHOR } from './config';

export const NAV_ITEMS = [
  { id: NavItem.HOME, label: '首页', icon: Terminal, path: '/' },
  { id: NavItem.NET, label: '网络', icon: Radio, path: '/net' },
  { id: NavItem.FILES, label: '数据', icon: FolderOpen, path: '/data' },
  { id: NavItem.GEAR, label: '技术', icon: Settings, path: '/gear' },
];
