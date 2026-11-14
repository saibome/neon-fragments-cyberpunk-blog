/** 文章正文增强：表格横向滚动容器 + 代码块工具栏（语言标签 / 换行 / 复制） */
const article = document.querySelector('.cyber-markdown');

if (article) {
  article.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('table-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper mb-6 border border-cyber-gray/50 bg-cyber-dark/30 max-w-full';
    wrapper.style.cssText = 'display:block;width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch';
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    table.style.marginBottom = '0';
  });

  article.querySelectorAll('pre').forEach(preElement => {
    const pre = preElement;
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper relative group mb-8 border border-cyber-gray bg-[#0a0a0a] w-full overflow-hidden rounded-md';
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    pre.style.cssText = 'margin:0;padding:1.5rem;border:none;background:transparent;max-width:100%;overflow-x:auto';

    const toolbar = document.createElement('div');
    toolbar.className = 'flex items-center justify-between px-4 py-2 border-b border-cyber-gray bg-cyber-dark/50 backdrop-blur-sm';

    const code = pre.querySelector('code');
    const langClass = code?.className.split(' ').find(name => name.startsWith('language-'));
    const rawLang = (langClass || '').replace('language-', '').toLowerCase();
    const lang = rawLang ? rawLang.toUpperCase() : '文本';

    const langLabel = document.createElement('span');
    langLabel.className = 'text-xs font-mono text-cyber-yellow';
    langLabel.textContent = `// ${lang}`;

    const actions = document.createElement('div');
    actions.className = 'flex items-center space-x-4';

    let wrapped = ['text', 'txt', 'markdown', 'md', 'plaintext', ''].includes(rawLang);
    const wrapButton = document.createElement('button');
    wrapButton.type = 'button';
    wrapButton.className = 'text-xs font-mono text-gray-400 hover:text-cyber-cyan transition-colors flex items-center cursor-pointer glitch-hover';

    function applyWrap() {
      pre.style.whiteSpace = wrapped ? 'pre-wrap' : 'pre';
      pre.style.wordBreak = wrapped ? 'break-word' : 'normal';
      wrapButton.textContent = wrapped ? '[ 取消换行 ]' : '[ 自动换行 ]';
      wrapButton.classList.toggle('text-cyber-cyan', wrapped);
    }
    applyWrap();
    wrapButton.addEventListener('click', () => {
      wrapped = !wrapped;
      applyWrap();
    });

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'text-xs font-mono text-gray-400 hover:text-cyber-cyan transition-colors flex items-center cursor-pointer glitch-hover';
    copyButton.textContent = '[ 复制 ]';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code?.innerText || pre.innerText || '');
        copyButton.textContent = '[ 已复制 ]';
        window.setTimeout(() => { copyButton.textContent = '[ 复制 ]'; }, 2000);
      } catch (error) {
        console.error('复制失败：', error);
      }
    });

    actions.append(wrapButton, copyButton);
    toolbar.append(langLabel, actions);
    wrapper.insertBefore(toolbar, pre);
  });
}
