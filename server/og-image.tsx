import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { BlogPost } from '../types';
import React from 'react';
import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';

const fontCache = new Map<string, Promise<ArrayBuffer>>();

function loadLocalFont(filename: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(filename);
  if (cached) return cached;

  const fontDirectory = import.meta.env.PROD ? 'dist/client/fonts' : 'public/fonts';
  const promise = fs.readFile(path.resolve(fontDirectory, filename)).then(buffer =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  );
  fontCache.set(filename, promise);
  promise.catch(() => fontCache.delete(filename));
  return promise;
}

export async function generateOgImage(post: BlogPost) {
  const [rajdhaniBold, shareTechMono, notoSansSC, notoSansSCBold] = await Promise.all([
    loadLocalFont('rajdhani-700.ttf'),
    loadLocalFont('share-tech-mono-400.ttf'),
    loadLocalFont('noto-sans-sc-400.ttf'),
    loadLocalFont('noto-sans-sc-700.ttf')
  ]);

  // Cyberpunk colors
  const colors = {
    yellow: '#fcee0a',
    cyan: '#00f0ff',
    red: '#ff003c',
    dark: '#121212',
    gray: '#2a2a2a',
    white: '#ffffff'
  };

  const dateObj = new Date(post.date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  const postUrl = `https://saibo.me/${year}/${month}/${day}/${post.slug}`;

  // Generate QR code manually for Satori
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
      {/* Background Pattern */}
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

      {/* Gradient Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #050505 100%)',
      }} />

      {/* Hover Effect Overlay (Yellow Tint) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, rgba(252, 238, 10, 0.05) 0%, transparent 100%)',
      }} />

      {/* Content Container */}
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

        {/* Header */}
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

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
           <p style={{
             fontSize: '32px',
             color: '#cccccc',
             lineHeight: 1.4,
             maxHeight: '180px',
             overflow: 'hidden',
             fontFamily: '"Noto Sans SC", sans-serif'
           }}>
             {post.description || post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '……'}
           </p>
        </div>

        {/* Footer / Tags */}
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

        {/* Decorative Elements */}
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
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return pngBuffer;
}
