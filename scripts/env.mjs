import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SITE_URL = 'https://saibo.me';

/**
 * 统一解析 SITE_URL：优先 shell / CI 环境变量，其次 .env.local。
 * Astro 配置、构建期页面渲染与 postbuild 都走这里，保证 canonical / feed /
 * OG 图 / Cloud Functions 使用同一个域名。
 */
export function resolveSiteUrl(cwd = process.cwd()) {
  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  try {
    const content = fs.readFileSync(path.join(cwd, '.env.local'), 'utf8');
    const line = content.match(/^\s*SITE_URL\s*=\s*(.+?)\s*$/m);
    if (line) {
      const value = line[1].replace(/^['"]|['"]$/g, '').trim();
      if (value) return value.replace(/\/+$/, '');
    }
  } catch {
    // 没有 .env.local 时使用默认站点地址
  }

  return DEFAULT_SITE_URL;
}
