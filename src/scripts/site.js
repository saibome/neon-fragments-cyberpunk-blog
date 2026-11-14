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
