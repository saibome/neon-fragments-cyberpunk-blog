import type { UserProfile } from './types';

/** 站点公开地址，可由运行时环境变量 SITE_URL 覆盖 */
export const DEFAULT_SITE_URL = 'https://saibo.me';

/** 不依赖外部图床的本地占位资源 */
export const DEFAULT_COVER = '/cover.svg';
export const DEFAULT_AVATAR = '/avatar.svg';

/** 列表页与 API 的默认分页大小 */
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
