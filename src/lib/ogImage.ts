import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from './site';
import { posts, postDescription } from './posts';
import type { BlogPost } from '../../types';

/**
 * OG 分享图在构建期生成 PNG。Satori 接受 React 元素形状的对象
 * （{ type, props }），因此这里用 h() 构造节点树，不引入 JSX / React。
 */
interface SatoriNode {
  type: string;
  props: Record<string, unknown>;
}

function h(type: string, props: Record<string, unknown> = {}, ...children: unknown[]): SatoriNode {
  return {
    type,
    props: { ...props, children: children.length <= 1 ? children[0] : children }
  };
}

const fontCache = new Map<string, Promise<ArrayBuffer>>();
let fontDirectoryPromise: Promise<string> | undefined;

/** 构建期优先读取 public/fonts，容器/预览环境也可通过 OG_FONT_DIR 覆盖 */
function resolveFontDirectory(): Promise<string> {
  if (process.env.OG_FONT_DIR) return Promise.resolve(path.resolve(process.env.OG_FONT_DIR));
  fontDirectoryPromise ??= (async () => {
    for (const dir of ['public/fonts', 'dist/fonts']) {
      const candidate = path.resolve(dir);
      try {
        await fs.access(path.join(candidate, 'rajdhani-700.ttf'));
        return candidate;
      } catch {
        // 该目录下没有字体，继续尝试下一个候选
      }
    }
    throw new Error('找不到 OG 图字体目录，请设置 OG_FONT_DIR');
  })();
  return fontDirectoryPromise;
}

function loadLocalFont(filename: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(filename);
  if (cached) return cached;

  const promise = resolveFontDirectory()
    .then(directory => fs.readFile(path.join(directory, filename)))
    .then(buffer =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    );
  fontCache.set(filename, promise);
  promise.catch(() => fontCache.delete(filename));
  return promise;
}

function cardTree(post: BlogPost, qrSize: number, qrData: Uint8Array | number[]) {
  const colors = {
    yellow: '#fcee0a',
    cyan: '#00f0ff',
    red: '#ff003c',
    dark: '#121212',
    gray: '#2a2a2a',
    white: '#ffffff'
  };

  const date = new Date(post.date);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  const dots: SatoriNode[] = [];
  for (let i = 0; i < qrData.length; i++) {
    if (qrData[i]) {
      dots.push(h('rect', {
        x: i % qrSize,
        y: Math.floor(i / qrSize),
        width: 1.05,
        height: 1.05,
        fill: colors.yellow
      }));
    }
  }

  return h('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.dark,
      color: colors.white,
      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }
  },
    h('div', { style: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: 'radial-gradient(circle at 25% 25%, #2a2a2a 2%, transparent 2.5%), radial-gradient(circle at 75% 75%, #2a2a2a 2%, transparent 2.5%)',
      backgroundSize: '40px 40px', opacity: 0.5
    } }),
    h('div', { style: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #050505 100%)'
    } }),
    h('div', { style: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(90deg, rgba(252, 238, 10, 0.05) 0%, transparent 100%)'
    } }),
    h('div', { style: {
      position: 'relative', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', height: '100%', width: '100%',
      padding: '60px', borderLeft: `12px solid ${colors.yellow}`
    } },
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: {
          display: 'flex', alignItems: 'center', marginBottom: '10px',
          fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace',
          fontSize: '24px', color: '#888'
        } },
          h('div', { style: { display: 'flex', marginRight: '10px' } },
            h('span', { style: { color: colors.cyan } }, String(year)),
            h('span', { style: { margin: '0 4px', color: '#666' } }, '::'),
            h('span', { style: { color: colors.yellow } }, month),
            h('span', { style: { margin: '0 4px', color: '#666' } }, '::'),
            h('span', { style: { color: colors.white } }, day)
          ),
          h('span', { style: { color: colors.cyan } }, `// ${post.author.name.toUpperCase()}`)
        ),
        h('h1', { style: {
          fontSize: '72px', fontWeight: 700, margin: '0 0 20px 0', lineHeight: 1.1,
          textTransform: 'uppercase', color: colors.yellow,
          textShadow: `2px 2px 0px ${colors.red}`
        } }, post.title)
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
        h('p', { style: {
          fontSize: '32px', color: '#cccccc', lineHeight: 1.4,
          maxHeight: '180px', overflow: 'hidden',
          fontFamily: '"Noto Sans SC", sans-serif'
        } }, postDescription(post))
      ),
      h('div', { style: {
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto'
      } },
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
          ...post.tags.slice(0, 4).map(tag => h('div', { style: {
            backgroundColor: '#1a1a1a', color: colors.cyan, border: '1px solid #333',
            padding: '8px 16px', fontSize: '20px',
            fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace',
            display: 'flex', alignItems: 'center'
          } }, `#${tag}`))
        ),
        h('div', { style: {
          display: 'flex', alignItems: 'center', gap: '10px',
          border: `1px solid ${colors.gray}`, padding: '5px',
          backgroundColor: 'rgba(0,0,0,0.5)'
        } },
          h('svg', {
            width: 160, height: 160, viewBox: `0 0 ${qrSize} ${qrSize}`,
            style: { shapeRendering: 'crispEdges' }
          }, ...dots),
          h('div', { style: {
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace',
            fontSize: '12px', color: colors.cyan, lineHeight: 1.2
          } },
            h('span', {}, '扫描目标'),
            h('span', { style: { color: colors.white } }, '访问数据')
          )
        )
      ),
      h('div', { style: {
        position: 'absolute', top: '40px', right: '40px',
        width: '20px', height: '20px', backgroundColor: colors.yellow
      } }),
      h('div', { style: {
        position: 'absolute', bottom: '40px', right: '40px',
        width: '100px', height: '4px', backgroundColor: colors.cyan
      } })
    )
  );
}

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

  return new Uint8Array(new Resvg(svg).render().asPng());
}

/** 给静态端点用的路径参数：从固定 permalink 解析，避免时区漂移 */
export function cardStaticPaths() {
  return posts.map(post => {
    const [, year, month, day, slug] = post.permalink.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/) ?? [];
    if (!year) throw new Error(`无法解析 permalink：${post.permalink}`);
    return { params: { year, month, day, slug }, props: { post } };
  });
}
