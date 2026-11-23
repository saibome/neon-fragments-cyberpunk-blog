import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import QRCode from 'qrcode';
import { cardTree } from '../src/lib/ogCard';
import type { BlogPost, UserProfile } from '../src/types';

const author: UserProfile = {
  name: '文博', handle: 'wenbo', role: 'writer', level: 1, bio: '',
  stats: { ram: 0, cpu: 0, network: 0 }
};

const base: BlogPost = {
  id: 'demo',
  title: '智谱 GLM-5.4 模型发布，已上线 Coding Plan',
  slug: 'demo',
  permalink: '/2026/11/23/demo',
  body: '',
  text: '',
  description: 'GLM-5.4 上线 Coding Plan，新增视觉能力。',
  date: '2026-11-23T00:00:00.000Z',
  author,
  tags: ['AI', 'GLM', 'Coding Plan'],
  readTime: '1 分钟'
};

function font(name: string, file: string, weight: 400 | 700) {
  const buffer = fs.readFileSync(path.resolve(file));
  return {
    name,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    weight,
    style: 'normal' as const
  };
}

const fonts = [
  font('Rajdhani', 'public/fonts/rajdhani-700.ttf', 700),
  font('Share Tech Mono', 'public/fonts/share-tech-mono-400.ttf', 400),
  font('Noto Sans SC', 'src/assets/og-fonts/noto-sans-sc-400.ttf', 400),
  font('Noto Sans SC', 'src/assets/og-fonts/noto-sans-sc-700.ttf', 700)
];

async function renderCard(description: string) {
  const qr = QRCode.create('https://saibo.me/2026/11/23/demo/', { errorCorrectionLevel: 'L' });
  return satori(cardTree({ ...base, description }, qr.modules.size, qr.modules.data) as never, {
    width: 1200,
    height: 675,
    fonts
  });
}

/** satori 会把越界元素直接裁进 clipPath，所以逐个量 rect 的右/下边界。 */
function assertInsideCanvas(svg: string) {
  const rects = [...svg.matchAll(/<rect\s[^>]*?x="([\d.]+)"[^>]*?y="([\d.]+)"[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"/g)];
  assert.ok(rects.length > 10, '应解析到卡片元素');
  for (const [, x, y, width, height] of rects) {
    assert.ok(Number(x) + Number(width) <= 1201, `元素右边越界：${x} + ${width}`);
    assert.ok(Number(y) + Number(height) <= 676, `元素底边越界：${y} + ${height}`);
  }
}

test('OG 卡片主容器按 border-box 计算，装饰与二维码留在画布内', async () => {
  const svg = await renderCard('GLM-5.4 上线 Coding Plan，新增视觉能力。');
  assert.match(svg, /<svg width="1200" height="675"/);
  // 旧布局 width:100% + padding:60px + border:12px 会被 content-box 撑到 1332px，
  // 右侧 132px 连同二维码、「扫描目标」文字和右上装饰一起被裁掉。
  // 用 includes 而非 match，失败时不会把整份 SVG 打进日志。
  assert.ok(svg.includes('0,0h1200v675h-1200z'), '主容器必须恰好占满画布');
  assert.ok(!svg.includes('h1332'), '主容器不能被 padding 撑出画布');
  assert.ok(
    svg.includes('<rect x="1140" y="40" width="20" height="20" fill="#fcee0a"'),
    '右上装饰应回到画布内'
  );
  assertInsideCanvas(svg);
});

test('长摘要换行不会把标签与二维码推出画布底部', async () => {
  const svg = await renderCard(
    '智谱 GLM-5.4 已上线 Coding Plan，新增视觉能力与更强的泛 Coding 能力；V2、V3 及团队版用户额度提升至 1.5 倍，' +
    '将模型名设置为 glm-5.4 即可开始使用，这是一段刻意写得很长的摘要，用来验证换行之后底部元素是否仍完整。'
  );
  assert.ok(
    svg.includes('<rect x="1140" y="40" width="20" height="20" fill="#fcee0a"'),
    '长摘要下右上装饰仍应完整'
  );
  assertInsideCanvas(svg);
});
