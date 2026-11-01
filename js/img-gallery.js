/*!
 * sail · img-gallery.js
 * 1) 正文单张图片：按固有宽高比区分横/竖版，横图撑满正文宽度（竖图沿用 CSS 限高居中）。
 * 2) 正文图片画廊（连续图片单行排列）：为桌面鼠标补上「按住拖动横向滑动」。
 * 触屏本身可滑动，无需处理；滚动吸附与容器样式见 style/base/_typography.scss。
 */

/* 单张图片（独占一行）：统一撑满正文宽度，使图片左右边缘与文字版面一致，
 * 避免「窄图两侧留白 / 横竖图宽度参差」的问题。
 * 纯 CSS 无法读取图片固有比例，故加载时由 JS 判定：只要图片是「独占一行」的
 * （带图注的 <figure class="img-figure">，或仅含单张图的 <p>），即加 .img--wide
 * （CSS: width:100%、取消高度上限）。横图、竖图均如此——竖图会相应变高，以整图
 * 完整展示，从而保持宽度一致。
 * 仅处理「独占一行」的图片；行内小图、画廊、链接卡缩略图均不参与，维持原有尺寸。
 * 懒加载图在 load 时才拿到尺寸，此刻恰好首次绘制，打标不会造成可见跳动。
 */
(function () {
  'use strict';

  var body = document.querySelector('.post__body, .page__body');
  if (!body) return;

  function isSolo(img) {
    var el = img.parentElement;
    if (!el) return false;
    // 带图注的单图：<figure class="img-figure"><img><figcaption>…
    if (el.classList && el.classList.contains('img-figure')) return true;
    // 画廊 / 链接卡缩略图：不参与
    if (el.closest && el.closest('.img-gallery, .link-card')) return false;
    if (el.tagName === 'A') el = el.parentElement;      // <p><a><img></a></p>
    if (!el || el.tagName !== 'P') return false;
    // 段落里除这张图（及其唯一包裹链接）外没有其它内容
    if (el.querySelectorAll('img').length !== 1) return false;
    var clone = el.cloneNode(true);
    var im = clone.querySelector('img');
    if (im) im.parentNode.removeChild(im);
    return clone.textContent.replace(/\s+/g, '') === '';
  }

  function tag(img) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    if (!isSolo(img)) return;
    // 独占一行的单图统一撑满正文宽度（横图竖图皆然），与文字版面左右对齐
    img.classList.add('img--wide');
  }

  var imgs = body.querySelectorAll('img');
  Array.prototype.forEach.call(imgs, function (img) {
    if (img.classList.contains('link-card__favicon')) return;
    if (img.complete && img.naturalWidth) {
      tag(img);
    } else {
      img.addEventListener('load', function () { tag(img); }, { once: true });
    }
  });
})();

(function () {
  'use strict';

  var galleries = document.querySelectorAll('.img-gallery');
  if (!galleries.length) return;

  Array.prototype.forEach.call(galleries, function (g) {
    var dragging = false;   // 是否处于鼠标拖拽中
    var moved = false;      // 本次按下是否真的移动过（用于区分「拖拽」与「点击开灯箱」）
    var startX = 0;
    var startLeft = 0;

    g.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = g.scrollLeft;
    });

    g.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        g.classList.add('is-dragging');
      }
      if (moved) g.scrollLeft = startLeft - dx;
    });

    function stop() {
      if (!dragging) return;
      dragging = false;
      g.classList.remove('is-dragging');
    }
    g.addEventListener('pointerup', stop);
    g.addEventListener('pointerleave', stop);
    g.addEventListener('pointercancel', stop);

    // 拖拽是浏览动作，不应触发图片原生拖影，也不该顺手打开灯箱
    g.addEventListener('dragstart', function (e) { e.preventDefault(); });
    g.addEventListener('click', function (e) {
      if (!moved) return;
      moved = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  });
})();
