/*!
 * sail · nav.js
 * 移动端抽屉：开合 / 焦点陷阱 / 滚动锁 / 二级菜单折叠 / 当前项高亮
 */
(function () {
  'use strict';

  var Sail = window.Sail || {};
  var drawer = document.getElementById('nav-drawer');
  var toggle = document.querySelector('.nav__toggle');

  /* ---------- 当前导航项高亮 ---------- */
  (function markActive() {
    var path = location.pathname.replace(/index\.html$/, '');
    var links = document.querySelectorAll('.nav__link, .nav__dropdown-link, .nav-drawer__link, .nav-drawer__sublink');
    var best = null, bestLen = -1;

    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^https?:/.test(href) && a.origin !== location.origin) return;
      var p = a.pathname ? a.pathname.replace(/index\.html$/, '') : href;
      // 首页只在完全相等时命中，避免"/"匹配所有路径
      var hit = p === '/' ? path === '/' : path.indexOf(p) === 0;
      if (hit && p.length > bestLen) { best = a; bestLen = p.length; }
    });

    if (!best) return;
    best.classList.add('is-active');
    best.setAttribute('aria-current', 'page');
    // 二级项命中时，父级也点亮
    var parentItem = best.closest('.nav__item');
    if (parentItem) {
      var top = parentItem.querySelector('.nav__link');
      if (top && top !== best) top.classList.add('is-active');
    }
  })();

  /* ---------- 桌面端：含子菜单的父项点击仅展开下拉，不跳转 ---------- */
  Array.prototype.forEach.call(
    document.querySelectorAll('.nav__item.has-children > .nav__link[data-nav-parent]'),
    function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        var item = trigger.closest('.nav__item');
        var open = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(open));
      });
    }
  );
  // 点击下拉以外的区域时收起已展开的项
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav__item.has-children')) return;
    Array.prototype.forEach.call(document.querySelectorAll('.nav__item.has-children.is-open'), function (item) {
      item.classList.remove('is-open');
      var t = item.querySelector('[data-nav-parent]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });

  if (!drawer) return;

  var panel = drawer.querySelector('.nav-drawer__panel');
  var releaseTrap = null;
  var isOpen = false;
  var closeTimer = null;

  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimeout(closeTimer);
    drawer.hidden = false;
    // 先渲染一帧再加 is-open，保证 transform 过渡生效
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (Sail.lockScroll) Sail.lockScroll();
    if (Sail.trapFocus) releaseTrap = Sail.trapFocus(drawer);
    if (panel) panel.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('is-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    if (Sail.unlockScroll) Sail.unlockScroll();
    closeTimer = setTimeout(function () { drawer.hidden = true; }, 260);
  }

  if (toggle) {
    toggle.addEventListener('click', function () { isOpen ? close() : open(); });
  }

  drawer.addEventListener('click', function (e) {
    // 遮罩、关闭按钮、导航链接（close_on_select）
    if (e.target.closest('[data-drawer-close]')) {
      var link = e.target.closest('a[data-drawer-close]');
      // 站内跳转让浏览器接管，只需还原滚动锁
      if (link) { close(); return; }
      e.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  // 视口放大回桌面宽度时自动收起，避免抽屉残留
  var mqDesktop = window.matchMedia('(min-width: 1025px)');
  var onDesktop = function (e) { if (e.matches && isOpen) close(); };
  mqDesktop.addEventListener ? mqDesktop.addEventListener('change', onDesktop)
                             : mqDesktop.addListener(onDesktop);

  /* ---------- 抽屉内二级菜单折叠 ---------- */
  Array.prototype.forEach.call(drawer.querySelectorAll('.nav-drawer__expand'), function (btn) {
    btn.addEventListener('click', function () {
      var sub = document.getElementById(btn.getAttribute('aria-controls'));
      if (!sub) return;
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      sub.hidden = expanded;
    });
  });

  // 若某个二级项是当前页，默认展开其父级
  var activeSub = drawer.querySelector('.nav-drawer__sublink.is-active');
  if (activeSub) {
    var ul = activeSub.closest('.nav-drawer__sub');
    var trigger = ul && ul.parentElement.querySelector('.nav-drawer__expand');
    if (ul && trigger) { ul.hidden = false; trigger.setAttribute('aria-expanded', 'true'); }
  }
})();
