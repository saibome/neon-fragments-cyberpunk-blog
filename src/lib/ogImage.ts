import satori from 'satori';
import sharp from 'sharp';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from './site';
import { getPosts } from './posts';
import { cardTree } from './ogCard';
import type { BlogPost } from '../types';

const fontCache = new Map<string, Promise<ArrayBuffer>>();

/**
 * 构建期字体分两处存放：
 * - src/assets/og-fonts：仅生成 OG 图需要的中文字体（约 20MB），不进入 dist/；
 * - public/fonts：浏览器实际加载的拉丁字体，会随 dist/ 一起部署。
 * 设置 OG_FONT_DIR 时改为只从该目录读取全部字体。
 */
const FONT_DIRECTORIES = ['src/assets/og-fonts', 'public/fonts'];

function loadLocalFont(filename: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(filename);
  if (cached) return cached;

  const promise = (async () => {
    const directories = process.env.OG_FONT_DIR
      ? [path.resolve(process.env.OG_FONT_DIR)]
      : FONT_DIRECTORIES.map(dir => path.resolve(dir));

    for (const directory of directories) {
      try {
        const buffer = await fs.readFile(path.join(directory, filename));
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    throw new Error(`找不到 OG 图字体 ${filename}，请检查 src/assets/og-fonts 或设置 OG_FONT_DIR`);
  })();

  fontCache.set(filename, promise);
  promise.catch(() => fontCache.delete(filename));
  return promise;
}

/** 节点树由 ogCard.ts 构造；satori 输出 SVG，sharp 光栅化为 1200×675 PNG。 */
export async function generateOgImage(post: BlogPost): Promise<Uint8Array> {
  const [rajdhaniBold, shareTechMono, notoSansSC, notoSansSCBold] = await Promise.all([
    loadLocalFont('rajdhani-700.ttf'),
    loadLocalFont('share-tech-mono-400.ttf'),
    loadLocalFont('noto-sans-sc-400.ttf'),
    loadLocalFont('noto-sans-sc-700.ttf')
  ]);

  const postUrl = `${SITE_URL}${post.permalink}`;
  const qr = QRCode.create(postUrl, { errorCorrectionLevel: 'L' });
  const tree = cardTree(post, qr.modules.size, qr.modules.data);

  const svg = await satori(tree as never, {
    width: 1200,
    height: 675,
    fonts: [
      { name: 'Rajdhani', data: rajdhaniBold, weight: 700, style: 'normal' },
      { name: 'Share Tech Mono', data: shareTechMono, weight: 400, style: 'normal' },
      { name: 'Noto Sans SC', data: notoSansSC, weight: 400, style: 'normal' },
      { name: 'Noto Sans SC', data: notoSansSCBold, weight: 700, style: 'normal' }
    ]
  });

  // sharp 是 Astro 官方默认的图片处理服务，这里复用它把 satori 生成的 SVG 光栅化为 PNG，
  // 不再额外引入单独的 SVG 渲染器。
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

/** 给静态端点用的路径参数：从内容集合的固定 permalink 解析，避免时区漂移 */
export async function cardStaticPaths() {
  const posts = await getPosts();
  return posts.map(post => {
    const [, year, month, day, slug] = post.permalink.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/) ?? [];
    if (!year) throw new Error(`无法解析 permalink：${post.permalink}`);
    return { params: { year, month, day, slug }, props: { post } };
  });
}
