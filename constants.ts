import { NavItem } from './types';

export { DEFAULT_AUTHOR } from './config';

/** icon 是 src/data/icons.json 中的静态 SVG 名称，不再依赖 React 图标组件 */
export const NAV_ITEMS = [
  { id: NavItem.HOME, label: '首页', icon: 'terminal', path: '/' },
  { id: NavItem.NET, label: '网络', icon: 'radio', path: '/net' },
  { id: NavItem.FILES, label: '数据', icon: 'folder-open', path: '/data' },
  { id: NavItem.GEAR, label: '技术', icon: 'settings', path: '/gear' }
];
