/*!
 * sail · gallery.js
 * 画廊：标签筛选 + 懒加载 + 分批滚动放出（参照 claudia 的交互）
 * 灯箱由 lightbox.js 统一接管，这里只负责可见性与图片加载。
 */
(function () {
  'use strict';

  var grid = document.querySelector('[data-gallery-grid]');
  if (!grid) return;

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.gallery__tag'));
  var emptyTip = document.querySelector('[data-gallery-empty]');
  var batchSize = parseInt(grid.getAttribute('data-batch-size'), 10) || 12;
  var activeTag = 'all';
  var imgObserver = null;
  var revealObserver = null;

  function items() {
    return Array.prototype.slice.call(grid.querySelectorAll('.gallery__item'));
  }

  /* ---------- 图片懒加载 ---------- */
  function markLoaded(img) {
    img.classList.add('is-loaded');
    var item = img.closest('.gallery__item');
    if (item) item.classList.add('is-loaded');
  }

  function loadImage(img) {
    if (!img || !img.dataset.src) return;
    var src = img.dataset.src;
    img.removeAttribute('data-src');
    img.addEventListener('load', function () { markLoaded(img); }, { once: true });
    img.addEventListener('error', function () { markLoaded(img); }, { once: true });
    img.src = src;
  }

  if ('IntersectionObserver' in window) {
    imgObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '400px 0px', threshold: 0.01 });
  }

  function observe(img) {
    if (!img || !img.dataset.src) return;
    if (imgObserver) imgObserver.observe(img);
    else loadImage(img);
  }

  /* ---------- 标签匹配 ---------- */
  function matches(item, tag) {
    if (tag === 'all') return true;
    var list = (item.getAttribute('data-tags') || '').split(',');
    return list.indexOf(tag) !== -1;
  }

  /* ---------- 可见性 ---------- */
  function syncVisible() {
    var visible = 0;
    items().forEach(function (item) {
      var ok = matches(item, activeTag) && !item.classList.contains('gallery__item--unloaded');
      item.classList.toggle('is-hidden', !ok);
      if (ok) {
        visible++;
        observe(item.querySelector('.gallery__img'));
      }
    });

    var pending = items().filter(function (item) {
      return matches(item, activeTag) && item.classList.contains('gallery__item--unloaded');
    }).length;

    if (emptyTip) emptyTip.hidden = !(visible === 0 && pending === 0);
    watchTail();
  }

  /* ---------- 分批放出 ---------- */
  function revealNext() {
    var pending = items().filter(function (item) {
      return matches(item, activeTag) && item.classList.contains('gallery__item--unloaded');
    });
    if (!pending.length) return;

    pending.slice(0, batchSize).forEach(function (item) {
      item.classList.remove('gallery__item--unloaded');
      item.classList.remove('is-hidden');
      item.classList.add('is-appended');
      observe(item.querySelector('.gallery__img'));
    });

    watchTail();
  }

  function watchTail() {
    if (revealObserver) revealObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;

    var shown = items().filter(function (i) { return !i.classList.contains('is-hidden'); });
    var pending = items().filter(function (item) {
      return matches(item, activeTag) && item.classList.contains('gallery__item--unloaded');
    });
    if (!shown.length || !pending.length) return;

    revealObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      revealObserver.disconnect();
      revealNext();
    }, { rootMargin: '600px 0px', threshold: 0 });

    revealObserver.observe(shown[shown.length - 1]);
  }

  /* ---------- 标签切换 ---------- */
  function applyTag(tag, push) {
    activeTag = tag;
    tabs.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-tag') === tag); });

    // 切到某个标签时，先确保该标签下有足够首屏内容
    var shownForTag = items().filter(function (item) {
      return matches(item, tag) && !item.classList.contains('gallery__item--unloaded');
    }).length;
    if (shownForTag < batchSize) revealNext();

    syncVisible();

    if (!push) return;
    if (tag === 'all') history.replaceState(null, '', location.pathname);
    else history.replaceState(null, '', '#' + encodeURIComponent(tag));
  }

  function hasTag(tag) {
    return tabs.some(function (t) { return t.getAttribute('data-tag') === tag; });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      applyTag(tab.getAttribute('data-tag'), true);
    });
  });

  window.addEventListener('hashchange', function () {
    var hash = decodeURIComponent(location.hash.replace('#', ''));
    applyTag(hasTag(hash) ? hash : 'all', false);
  });

  /* ---------- 初始化 ---------- */
  var initial = decodeURIComponent(location.hash.replace('#', ''));
  applyTag(hasTag(initial) ? initial : 'all', false);
})();
