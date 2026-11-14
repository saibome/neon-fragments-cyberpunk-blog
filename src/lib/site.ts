import { normalizeSiteUrl } from '../consts';

/**
 * 静态站点没有运行时：SITE_URL 在构建期读取一次，
 * canonical / sitemap / RSS / 分享卡片全部使用同一个值。
 */
export const SITE_URL = normalizeSiteUrl(process.env.SITE_URL);
