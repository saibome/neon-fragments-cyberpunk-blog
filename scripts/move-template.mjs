import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('dist/client/index.html');
const targetDir = path.resolve('dist/template');
const target = path.join(targetDir, 'index.html');

if (!fs.existsSync(source)) {
  console.error(`找不到客户端模板：${source}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.rmSync(target, { force: true });
fs.renameSync(source, target);
console.log(`客户端模板已移至 ${target}`);
