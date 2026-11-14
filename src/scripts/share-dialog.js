/** 分享弹窗：原生 <dialog> 处理焦点陷阱与 ESC，这里只负责开关与复制 */
const dialog = document.querySelector('[data-share-dialog]');

if (dialog) {
  document.querySelectorAll('[data-share-open]').forEach(button => {
    button.addEventListener('click', () => dialog.showModal());
  });

  document.querySelectorAll('[data-share-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const label = button.querySelector('[data-copy-label]');
      try {
        await navigator.clipboard.writeText(button.dataset.copy || '');
        if (label) {
          const original = label.textContent;
          label.textContent = '已复制';
          window.setTimeout(() => { label.textContent = original; }, 2000);
        }
      } catch (error) {
        console.error('复制失败：', error);
      }
    });
  });
}
