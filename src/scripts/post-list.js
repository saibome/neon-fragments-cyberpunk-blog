/**
 * 首页文章列表：全部卡片已由 Astro 预渲染进 HTML（利于 SEO），
 * 这里只按 URL 参数做搜索 / 标签 / 分页的显隐，无需 fetch API。
 */
const root = document.querySelector('[data-post-list]');

if (root) {
  const cards = Array.from(root.querySelectorAll('[data-post-card]'));
  const input = root.querySelector('[data-post-search]');
  const clearSearch = root.querySelector('[data-clear-search]');
  const tagChip = root.querySelector('[data-tag-chip]');
  const tagLabel = root.querySelector('[data-tag-label]');
  const clearTag = root.querySelector('[data-clear-tag]');
  const prev = root.querySelector('[data-page-prev]');
  const next = root.querySelector('[data-page-next]');
  const pageLabel = root.querySelector('[data-page-label]');
  const empty = root.querySelector('[data-empty]');
  const pageSize = Math.max(1, Number(root.dataset.pageSize) || 10);

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      page: Math.max(1, Number(params.get('page')) || 1),
      search: (params.get('search') || '').trim(),
      tag: (params.get('tags') || params.get('tag') || '').trim()
    };
  }

  function writeParams(patch) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
    render();
  }

  function render() {
    const { page, search, tag } = readParams();
    const keyword = search.toLowerCase();
    const selectedTag = tag.toLowerCase();

    const matched = cards.filter(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const tags = (card.dataset.tags || '').toLowerCase().split('|');
      const matchesSearch = !keyword || title.includes(keyword) || tags.some(item => item.includes(keyword));
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });

    const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;

    for (const card of cards) card.hidden = true;
    matched.slice(start, start + pageSize).forEach(card => { card.hidden = false; });

    if (input && document.activeElement !== input) input.value = search;
    if (clearSearch) clearSearch.hidden = !search;
    if (tagChip) {
      tagChip.hidden = !tag;
      if (tagLabel) tagLabel.textContent = tag;
    }
    if (empty) empty.hidden = matched.length !== 0;
    if (pageLabel) pageLabel.innerHTML = `第 <span class="text-white font-bold">${currentPage}</span> 页，共 ${totalPages} 页`;
    if (prev) prev.disabled = currentPage <= 1;
    if (next) next.disabled = currentPage >= totalPages;
  }

  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      writeParams({ search: input.value.trim(), page: '1' });
    }
  });

  clearSearch?.addEventListener('click', () => {
    if (input) input.value = '';
    writeParams({ search: '', page: '1' });
    input?.focus();
  });

  clearTag?.addEventListener('click', () => writeParams({ tags: '', tag: '', page: '1' }));

  prev?.addEventListener('click', () => {
    writeParams({ page: String(Math.max(1, readParams().page - 1)) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  next?.addEventListener('click', () => {
    writeParams({ page: String(readParams().page + 1) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('popstate', render);
  render();
}
