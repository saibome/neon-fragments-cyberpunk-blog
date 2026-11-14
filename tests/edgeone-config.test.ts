import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));

const config = JSON.parse(read('edgeone.json'));

test('edgeone.json 声明 bun 构建命令与预装 Node 版本，且不含函数配置', () => {
  assert.equal(config.outputDirectory, 'dist');
  assert.match(config.buildCommand, /^bun run build/);
  assert.match(config.installCommand, /bun@1\.4\.4/);
  assert.match(config.installCommand, /bun install --frozen-lockfile/);
  assert.equal(config.nodeVersion, '24.5.0', '用于安装 bun 的 npm 环境必须是平台预装版本');
  assert.ok(['24.5.0', '24.11.0', '24.18.0'].includes(config.nodeVersion));
  assert.equal(config.cloudFunctions, undefined, '站点为纯静态部署，不应配置 Cloud Functions');
  assert.ok(config.rewrites.length <= 100);
  assert.ok(config.headers.length <= 30);
});

test('clean URL 兜底规则只包含现存静态页', () => {
  const sources = config.rewrites.map((rule: { source: string }) => rule.source);
  assert.deepEqual(sources.sort(), ['/gear', '/net']);
  for (const rule of config.rewrites) {
    assert.equal(rule.destination, `${rule.source}.html`);
  }
});

test('包管理器、锁文件与脚本统一使用 bun', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.packageManager, 'bun@1.4.4');
  assert.equal(pkg.engines.bun, '>=1.4.4');
  assert.match(pkg.scripts.build, /bun run --bun astro build/);
  assert.match(pkg.scripts['build:content'], /^bun scripts\/build-content\.ts$/);
  assert.match(pkg.scripts.test, /^bun test/);
  assert.equal(pkg.scripts.start, undefined, '自托管静态服务已移除');
  assert.equal(pkg.scripts.preview, undefined, '自托管静态服务已移除');
  assert.equal(pkg.devDependencies.tsx, undefined, 'bun 原生执行 TypeScript，不需要 tsx');
  assert.ok(exists('bun.lock'), '缺少 bun.lock');
  for (const legacy of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package-lock.json', 'yarn.lock']) {
    assert.equal(exists(legacy), false, `不应存在 ${legacy}`);
  }
});

test('根目录不提交 .nvmrc，且 .gitignore 忽略它', () => {
  const tracked = execFileSync('git', ['ls-files', '--', '.nvmrc'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();
  assert.equal(tracked, '', '提交 .nvmrc 会让 EdgeOne 切换非预装版本并直接构建失败');
  assert.match(read('.gitignore'), /^\.nvmrc$/m);
  assert.equal(exists('.nvmrc.example'), false);
});

test('package.json 的 engines 允许 EdgeOne 的 Node 24.5.0', () => {
  const pkg = JSON.parse(read('package.json'));
  const engineNode: string = pkg.engines?.node ?? '';
  assert.match(engineNode, /^>=/);
  assert.doesNotMatch(engineNode, /\b2[5-9]\b/, 'engines 不能要求 Node 25+');
  assert.match(engineNode, /22\.23\.4/, 'Astro 7 的最低 Node 要求');
});

test('已移除的运行时功能没有回退', () => {
  const removed = [
    'cloud-functions', 'scripts/serve.mjs', 'Dockerfile', '.dockerignore',
    'lib/postList.ts', 'src/pages/api', 'src/pages/atom.xml.ts',
    'src/pages/data.astro', 'src/scripts/brain-wave.js'
  ];
  for (const item of removed) {
    assert.equal(exists(item), false, `不应存在 ${item}`);
  }
});

test('订阅源只保留 RSS / sitemap / robots', () => {
  for (const page of ['rss.xml.ts', 'sitemap.xml.ts', 'robots.txt.ts']) {
    assert.ok(exists(`src/pages/${page}`), `缺少 ${page}`);
  }
  assert.equal(exists('src/pages/atom.xml.ts'), false, 'Atom 与 RSS 重复，已移除');
  assert.doesNotMatch(read('src/lib/feeds.ts'), /renderAtom/);
  assert.doesNotMatch(read('src/lib/feeds.ts'), /\/data/);
});

test('OG 图专用的中文字体不进入 public/fonts', () => {
  for (const font of ['noto-sans-sc-400.ttf', 'noto-sans-sc-700.ttf']) {
    assert.equal(exists(`public/fonts/${font}`), false, `${font} 只用于构建期生成 OG 图`);
    assert.ok(exists(`assets/og-fonts/${font}`), `缺少 assets/og-fonts/${font}`);
  }
  assert.ok(exists('public/fonts/rajdhani-700.ttf'));
  assert.ok(exists('public/fonts/share-tech-mono-400.ttf'));
  assert.doesNotMatch(read('src/lib/ogImage.ts'), /dist\/fonts/);
});

test('CI 只做质量门禁与静态产物上传', () => {
  const ci = read('.github/workflows/build.yml');
  assert.match(ci, /check:edgeone/);
  assert.doesNotMatch(ci, /release\.zip|Dockerfile|action-gh-release|git tag/);
});
