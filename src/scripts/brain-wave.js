/** 侧栏「神经活动」波形：原生 SVG path 动画，替代 d3 */
const path = document.querySelector('[data-brain-wave-path]');

if (path) {
  const count = 40;
  const width = 200;
  const height = 60;
  let values = Array.from({ length: count }, () => Math.random());

  function toPathData() {
    const points = values.map((value, index) => [
      (index * width) / (count - 1),
      height - value * height
    ]);
    const first = points[0];
    let data = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
    for (let index = 1; index < points.length; index++) {
      const [x0, y0] = points[index - 1];
      const [x1, y1] = points[index];
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      data += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }
    const last = points[points.length - 1];
    return `${data} L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  }

  path.setAttribute('d', toPathData());

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    window.setInterval(() => {
      values = [...values.slice(1), Math.random()];
      path.setAttribute('d', toPathData());
    }, 100);
  }
}
