/** 移动端个人资料抽屉：只切一个 body 状态，具体样式在 global.css */
const toggle = document.querySelector('[data-profile-toggle]');
const backdrop = document.querySelector('[data-sidebar-backdrop]');
const panel = document.querySelector('[data-mobile-sidebar]');

function setSidebar(open) {
  document.body.dataset.sidebarOpen = String(open);
  toggle?.setAttribute('aria-expanded', String(open));
}

toggle?.addEventListener('click', () => {
  setSidebar(document.body.dataset.sidebarOpen !== 'true');
});

backdrop?.addEventListener('click', () => setSidebar(false));

panel?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setSidebar(false));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.dataset.sidebarOpen === 'true') {
    setSidebar(false);
  }
});

/** 手机端顶栏的搜索按钮：当前页有搜索框就聚焦，否则回首页并聚焦 */
function focusSearch() {
  const input = document.querySelector('[data-post-search]');
  if (!input) return false;
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus({ preventScroll: true });
  return true;
}

document.querySelector('[data-nav-search]')?.addEventListener('click', () => {
  if (!focusSearch()) window.location.href = '/#search';
});

if (window.location.hash === '#search') focusSearch();
