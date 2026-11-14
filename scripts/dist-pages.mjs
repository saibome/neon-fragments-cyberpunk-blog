import fs from 'node:fs/promises';
import path from 'node:path';

/** EdgeOne clean URL 兜底需要的静态页（文章页由内容集合自动扩充） */
export const STATIC_PAGES = ['net', 'gear'];

/**
 * 从 dist/ 里扫描形如 YYYY/MM/DD/slug/index.html 的文章页。
 * 内容集合是唯一数据源，构建脚本不再依赖 services/posts.json 之类的中间产物，
 * 而是直接以 Astro 生成的目录结构为准。
 */
export async function findPostDirs(dist) {
  const found = [];
  let years;
  try {
    years = await fs.readdir(dist, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return found;
    throw error;
  }

  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearPath = path.join(dist, year.name);
    for (const month of await fs.readdir(yearPath, { withFileTypes: true })) {
      if (!month.isDirectory() || !/^\d{2}$/.test(month.name)) continue;
      const monthPath = path.join(yearPath, month.name);
      for (const day of await fs.readdir(monthPath, { withFileTypes: true })) {
        if (!day.isDirectory() || !/^\d{2}$/.test(day.name)) continue;
        const dayPath = path.join(monthPath, day.name);
        for (const slug of await fs.readdir(dayPath, { withFileTypes: true })) {
          if (!slug.isDirectory()) continue;
          const relative = `${year.name}/${month.name}/${day.name}/${slug.name}`;
          try {
            await fs.access(path.join(dist, relative, 'index.html'));
            found.push(relative);
          } catch {
            // 该目录不是文章页，忽略
          }
        }
      }
    }
  }

  return found.sort();
}
