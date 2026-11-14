import test from 'node:test';
import assert from 'node:assert/strict';
import { makePermalink, cardUrl, absoluteUrl } from '../lib/permalink';

test('永久链接只由 UTC 日期决定，切换运行时时区不会漂移', () => {
  const iso = '2026-11-14T20:00:00.000Z';
  const original = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    const inUtc = makePermalink(iso, 'hello-night-city');
    process.env.TZ = 'Asia/Shanghai';
    const inShanghai = makePermalink(iso, 'hello-night-city');
    process.env.TZ = 'Pacific/Kiritimati';
    const inKiritimati = makePermalink(iso, 'hello-night-city');

    assert.equal(inUtc, '/2026/11/14/hello-night-city');
    assert.equal(inShanghai, inUtc);
    assert.equal(inKiritimati, inUtc);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('无效日期直接报错', () => {
  assert.throws(() => makePermalink('not-a-date', 'x'), /无法从/);
});

test('卡片地址与绝对地址都复用同一个 permalink', () => {
  assert.equal(cardUrl('/2026/11/14/a'), '/card/2026/11/14/a.png');
  assert.equal(absoluteUrl('https://example.com/', '/x'), 'https://example.com/x');
});
