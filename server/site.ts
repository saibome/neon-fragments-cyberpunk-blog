import { normalizeSiteUrl } from '../config';

/**
 * 服务端站点地址：优先读取运行时 SITE_URL，同一个镜像可以部署到不同域名，
 * canonical / sitemap / RSS / 分享卡片都会使用这个值，并通过首屏数据传给浏览器。
 */
export const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL || import.meta.env?.VITE_SITE_URL
);
