import { NavItem } from './types';
import type { UserProfile } from './types';

/** 站点级常量集中在这里，避免散落在仓库根目录 */
export const DEFAULT_SITE_URL = 'https://saibo.me';
export const SITE_TITLE = '霓虹碎片：赛博朋克博客';
export const SITE_DESCRIPTION = '记录代码、设计、装备与夜之城灵感的沉浸式赛博朋克博客。';

/** sitemap 收录的静态页面（文章页由内容集合补齐） */
export const STATIC_PAGES = ['/', '/net', '/gear'];

/** 不依赖外部图床的本地占位资源 */
export const DEFAULT_COVER = '/cover.svg';
export const DEFAULT_AVATAR = '/avatar.svg';

/** 列表页的默认分页大小 */
export const PAGE_SIZE = 10;

export const DEFAULT_AUTHOR: UserProfile = {
  name: '文博',
  handle: '@venbo',
  handle_link: 'https://saibo.me/venbo',
  role: '网络行者',
  level: 50,
  bio: '穿梭于夜之城的数据流中，猎杀恶魔，躲避企业的冰封。一切终将消亡。',
  stats: {
    ram: 64,
    cpu: 88,
    network: 42
  }
};

export function normalizeSiteUrl(value?: string): string {
  return (value?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/** icon 是 src/data/icons.json 中的静态 SVG 名称，不依赖图标库 */
export const NAV_ITEMS = [
  { id: NavItem.HOME, label: '首页', icon: 'terminal', path: '/' },
  { id: NavItem.NET, label: '网络', icon: 'radio', path: '/net' },
  { id: NavItem.GEAR, label: '技术', icon: 'settings', path: '/gear' }
];
