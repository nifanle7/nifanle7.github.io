/*!
 * sail · lightbox.js
 * 图片灯箱：正文 / 画廊统一接管，支持组内翻页、键盘与手势
 */
(function () {
  'use strict';

  var Sail = window.Sail || {};
  var I18N = (window.SAIL || {}).i18n || {};

  // 参与灯箱的图片：正文图（排除被链接包裹的）与画廊图
  var SELECTOR = [
    '.post__body img:not(.no-zoom)',
    '.page__body img:not(.no-zoom)',
    '.img-gallery__item img',
    '.gallery__img'
  ].join(',');

  var imgs = Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (img) {
    // 外链图片包了 <a> 的，尊重原链接行为
    var a = img.closest('a');
    return !(a && a.getAttribute('href') && !/\.(png|jpe?g|gif|webp|avif)$/i.test(a.getAttribute('href')));
  });
  if (!imgs.length) return;

  var box = null, imgEl = null, capEl = null, counterEl = null;
  var group = [], cursor = 0, releaseTrap = null, lastFocus = null;

  function build() {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.hidden = true;
    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="' + (I18N.close || '关闭') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      '<button class="lightbox__nav lightbox__prev" type="button" aria-label="上一张">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<figure class="lightbox__figure">' +
        '<img alt="">' +
        '<figcaption class="lightbox__caption"></figcaption>' +
      '</figure>' +
      '<button class="lightbox__nav lightbox__next" type="button" aria-label="下一张">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>' +
      '</button>' +
      '<div class="lightbox__counter"></div>';
    document.body.appendChild(box);

    imgEl = box.querySelector('img');
    capEl = box.querySelector('.lightbox__caption');
    counterEl = box.querySelector('.lightbox__counter');

    box.addEventListener('click', function (e) {
      if (e.target.closest('.lightbox__close')) return close();
      if (e.target.closest('.lightbox__prev')) return step(-1);
      if (e.target.closest('.lightbox__next')) return step(1);
      // 点击空白区域关闭（点图片本身不关）
      if (!e.target.closest('.lightbox__figure')) close();
    });

    bindSwipe();
  }

  // 同一容器内的图片视为一组，可左右翻页
  // 画廊按标签筛选/分批加载时，隐藏的图片不参与翻页
  function isHidden(node) {
    var item = node.closest('.gallery__item');
    if (item && (item.classList.contains('is-hidden') || item.classList.contains('gallery__item--unloaded'))) return true;
    return node.offsetParent === null && getComputedStyle(node).position !== 'fixed';
  }

  function groupOf(img) {
    var scope = img.closest('.img-gallery, .gallery__grid, .post__body, .page__body');
    if (!scope) return [img];
    var list = Array.prototype.filter.call(scope.querySelectorAll(SELECTOR), function (n) {
      return imgs.indexOf(n) !== -1 && !isHidden(n);
    });
    return list.length ? list : [img];
  }

  function srcOf(img) {
    // 优先原图：data-src(懒加载) > 父级 <a href="*.jpg"> > currentSrc
    var a = img.closest('a');
    if (a && /\.(png|jpe?g|gif|webp|avif)$/i.test(a.getAttribute('href') || '')) return a.href;
    return img.getAttribute('data-src') || img.currentSrc || img.src;
  }

  function captionOf(img) {
    var fig = img.closest('figure');
    var cap = fig && fig.querySelector('figcaption');
    return (cap && cap.textContent.trim()) || img.getAttribute('alt') || '';
  }

  function show(i) {
    cursor = (i + group.length) % group.length;
    var img = group[cursor];
    imgEl.src = srcOf(img);
    imgEl.alt = img.alt || '';
    var cap = captionOf(img);
    capEl.textContent = cap;
    capEl.hidden = !cap;
    counterEl.textContent = group.length > 1 ? (cursor + 1) + ' / ' + group.length : '';
    box.classList.toggle('is-single', group.length < 2);
  }

  function step(d) { if (group.length > 1) show(cursor + d); }

  function open(img) {
    if (!box) build();
    lastFocus = document.activeElement;
    group = groupOf(img);
    box.hidden = false;
    show(group.indexOf(img));
    if (Sail.lockScroll) Sail.lockScroll();
    if (Sail.trapFocus) releaseTrap = Sail.trapFocus(box);
    box.querySelector('.lightbox__close').focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    imgEl.src = '';
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    if (Sail.unlockScroll) Sail.unlockScroll();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* 触屏左右滑动翻页 / 下滑关闭 */
  function bindSwipe() {
    var x0 = 0, y0 = 0, t0 = 0;
    box.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 > 600) return;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) close();
    }, { passive: true });
  }

  imgs.forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function (e) {
      e.preventDefault();
      open(img);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!box || box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
})();
