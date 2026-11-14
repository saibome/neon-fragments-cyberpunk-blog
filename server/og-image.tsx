import React from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from './site';
import type { BlogPost } from '../types';

const fontCache = new Map<string, Promise<ArrayBuffer>>();
let fontDirectoryPromise: Promise<string> | undefined;

/**
 * 字体目录按实际文件探测，兼容源码运行（构建期预渲染）、生产 SSR bundle
 * 与容器部署，不再依赖 Vite 的 import.meta.env 常量。也可用 OG_FONT_DIR 覆盖。
 */
function resolveFontDirectory(): Promise<string> {
  if (process.env.OG_FONT_DIR) return Promise.resolve(path.resolve(process.env.OG_FONT_DIR));
  fontDirectoryPromise ??= (async () => {
    for (const dir of ['dist/client/fonts', 'public/fonts']) {
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

export async function generateOgImage(post: BlogPost): Promise<Buffer> {
  const [rajdhaniBold, shareTechMono, notoSansSC, notoSansSCBold] = await Promise.all([
    loadLocalFont('rajdhani-700.ttf'),
    loadLocalFont('share-tech-mono-400.ttf'),
    loadLocalFont('noto-sans-sc-400.ttf'),
    loadLocalFont('noto-sans-sc-700.ttf')
  ]);

  const colors = {
    yellow: '#fcee0a',
    cyan: '#00f0ff',
    red: '#ff003c',
    dark: '#121212',
    gray: '#2a2a2a',
    white: '#ffffff'
  };

  const dateObj = new Date(post.date);
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const postUrl = `${SITE_URL}${post.permalink}`;

  // 为 Satori 生成二维码点阵（Satori 不支持直接绘制 canvas）
  const qr = QRCode.create(postUrl, { errorCorrectionLevel: 'L' });
  const { size, data } = qr.modules;
  const dots: React.ReactElement[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i]) {
      const x = i % size;
      const y = Math.floor(i / size);
      dots.push(
        <rect
          key={i}
          x={x}
          y={y}
          width={1.05}
          height={1.05}
          fill={colors.yellow}
        />
      );
    }
  }

  const svg = await satori(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.dark,
        color: colors.white,
        fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 25% 25%, #2a2a2a 2%, transparent 2.5%), radial-gradient(circle at 75% 75%, #2a2a2a 2%, transparent 2.5%)',
        backgroundSize: '40px 40px',
        opacity: 0.5,
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #050505 100%)',
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, rgba(252, 238, 10, 0.05) 0%, transparent 100%)',
      }} />

      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: '100%',
        padding: '60px',
        borderLeft: `12px solid ${colors.yellow}`,
      }}>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace', fontSize: '24px', color: '#888' }}>
            <div style={{ display: 'flex', marginRight: '10px' }}>
                <span style={{ color: colors.cyan }}>{year}</span>
                <span style={{ margin: '0 4px', color: '#666' }}>::</span>
                <span style={{ color: colors.yellow }}>{month}</span>
                <span style={{ margin: '0 4px', color: '#666' }}>::</span>
                <span style={{ color: colors.white }}>{day}</span>
            </div>
            <span style={{ color: colors.cyan }}>// {post.author.name.toUpperCase()}</span>
          </div>

          <h1 style={{
            fontSize: '72px',
            fontWeight: 700,
            margin: '0 0 20px 0',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            color: colors.yellow,
            textShadow: `2px 2px 0px ${colors.red}`,
          }}>
            {post.title}
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
           <p style={{
             fontSize: '32px',
             color: '#cccccc',
             lineHeight: 1.4,
             maxHeight: '180px',
             overflow: 'hidden',
             fontFamily: '"Noto Sans SC", sans-serif'
           }}>
             {post.description || `${(post.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150)}……`}
           </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {post.tags.slice(0, 4).map(tag => (
              <div key={tag} style={{
                backgroundColor: '#1a1a1a',
                color: colors.cyan,
                border: '1px solid #333',
                padding: '8px 16px',
                fontSize: '20px',
                fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace',
                display: 'flex',
                alignItems: 'center'
              }}>
                #{tag}
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: `1px solid ${colors.gray}`,
            padding: '5px',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}>
            <svg width="160" height="160" viewBox={`0 0 ${size} ${size}`} style={{ shapeRendering: 'crispEdges' }}>
              {dots}
            </svg>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: '"Share Tech Mono", "Noto Sans SC", monospace',
              fontSize: '12px',
              color: colors.cyan,
              lineHeight: 1.2
            }}>
              <span>扫描目标</span>
              <span style={{ color: colors.white }}>访问数据</span>
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '20px',
          height: '20px',
          backgroundColor: colors.yellow
        }} />

        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '100px',
          height: '4px',
          backgroundColor: colors.cyan
        }} />

      </div>
    </div>,
    {
      width: 1200,
      height: 675,
      fonts: [
        {
          name: 'Rajdhani',
          data: rajdhaniBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Share Tech Mono',
          data: shareTechMono,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Noto Sans SC',
          data: notoSansSC,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Noto Sans SC',
          data: notoSansSCBold,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}
