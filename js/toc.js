/*!
 * sail · toc.js
 * 目录：滚动高亮（scroll-spy）/ 平滑滚动 / 长目录自动跟随
 */
(function () {
  'use strict';

  var Sail = window.Sail || {};
  var widget = document.getElementById('toc-widget');
  var body = document.querySelector('.post__body');
  if (!widget || !body) return;

  var links = Array.prototype.slice.call(widget.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var scrollBox = widget.querySelector('.toc__body') || widget;

  // 建立 链接 → 标题节点 映射（Hexo toc() 生成的 href 已 URL 编码）
  var entries = links.map(function (a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var target = document.getElementById(id) || body.querySelector('[id="' + CSS.escape(id) + '"]');
    return target ? { link: a, target: target, li: a.closest('li') } : null;
  }).filter(Boolean);

  if (!entries.length) return;

  var currentLi = null;

  function setActive(li) {
    if (li === currentLi) return;
    if (currentLi) currentLi.classList.remove('active');
    currentLi = li;
    if (!li) return;
    li.classList.add('active');

    // 目录很长时，把高亮项滚进可视区（只滚目录容器，不动页面）
    if (scrollBox.scrollHeight > scrollBox.clientHeight + 8) {
      var boxRect = scrollBox.getBoundingClientRect();
      var liRect = li.getBoundingClientRect();
      if (liRect.top < boxRect.top || liRect.bottom > boxRect.bottom) {
        scrollBox.scrollTop += liRect.top - boxRect.top - scrollBox.clientHeight / 2 + liRect.height / 2;
      }
    }
  }

  // 以"标题越过视口上方 96px 线"为准判断当前章节，比 IO 更稳
  var OFFSET = 96;

  function spy() {
    var found = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].target.getBoundingClientRect().top - OFFSET <= 0) found = entries[i];
      else break;
    }
    // 滚到底部时强制点亮最后一项（末章太短时的兜底）
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      found = entries[entries.length - 1];
    }
    setActive(found ? found.li : null);
  }

  var spyThrottled = Sail.rafThrottle ? Sail.rafThrottle(spy) : spy;
  window.addEventListener('scroll', spyThrottled, { passive: true });
  window.addEventListener('resize', spyThrottled, { passive: true });
  spy();

  /* ---------- 平滑滚动 + 更新 hash（不产生跳动）---------- */
  widget.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - (OFFSET - 16);
    window.scrollTo({ top: top, behavior: Sail.motionOff ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#' + encodeURIComponent(id));
    // 让键盘用户焦点跟过去
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- 回到顶部 ---------- */
  var topLink = widget.querySelector('[data-toc-top]');
  if (topLink) {
    topLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: Sail.motionOff ? 'auto' : 'smooth' });
      history.replaceState(null, '', ' ');
    });
  }
})();
