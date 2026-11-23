import { postDescription } from './post-utils';
import type { BlogPost } from '../types';

/**
 * Satori 接受 React 元素形状的对象（{ type, props }），因此这里用 h() 构造
 * OG 分享卡的节点树，不引入 JSX / React。本模块与 astro:content 解耦，
 * bun test 可以直接 import 并渲染真实 SVG 做布局回归断言。
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

export function cardTree(post: BlogPost, qrSize: number, qrData: Uint8Array | number[]) {
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
      // satori 默认按 content-box 计算：width:100% 再加 padding/border 会撑到 1332px，
      // 超出 1200px 画布，右下二维码、装饰与长摘要都会被裁掉。
      boxSizing: 'border-box',
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
        // 固定在画布底部：摘要行数变化不该把标签与二维码推出 675px 画布。
        // left/right 对齐主容器的内容区（12px 左边框 + 60px 左右内边距）。
        position: 'absolute', left: 72, right: 60, bottom: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'
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
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
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
