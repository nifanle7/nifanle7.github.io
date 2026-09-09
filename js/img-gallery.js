/*!
 * sail · img-gallery.js
 * 正文图片画廊（连续图片单行排列）：为桌面鼠标补上「按住拖动横向滑动」。
 * 触屏本身可滑动，无需处理；滚动吸附与容器样式见 style/base/_typography.scss。
 */
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
