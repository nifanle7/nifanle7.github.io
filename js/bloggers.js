/*!
 * sail · bloggers.js
 * 博主专题页：标签筛选 + 关键词搜索 + iframe 预览懒加载
 * 结构强依赖 layout/bloggers.ejs 输出的 [data-bloggers-grid] 等钩子。
 */
(function () {
  'use strict';

  var grid = document.querySelector('[data-bloggers-grid]');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.blogger-card'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.bloggers__tag'));
  var search = document.querySelector('[data-bloggers-search]');
  var counter = document.querySelector('[data-bloggers-count]');
  var emptyTip = document.querySelector('[data-bloggers-empty]');

  var activeTag = 'all';
  var keyword = '';

  /* ---------- 预览：仅点击播放按钮才加载 iframe ---------- */
  // 不使用悬停自动加载：一是避免鼠标扫过就给 15 个站带流量，
  // 二是截图已经承担了「长什么样」的职责，实时预览做成可选动作。
  function loadPreview(card) {
    var src = card.getAttribute('data-src');
    if (!src || card.classList.contains('is-live') || card.classList.contains('is-loading')) return;

    card.classList.add('is-loading');
    var frame = document.createElement('iframe');
    frame.className = 'blogger-card__preview';
    frame.loading = 'lazy';
    frame.title = '预览';
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.src = src;

    var done = false;
    frame.addEventListener('load', function () {
      done = true;
      card.classList.remove('is-loading');
      card.classList.add('is-live');
      frame.classList.add('is-ready');
    });

    // 跨源情况下拿不到实际渲染结果，超时后按成功处理
    setTimeout(function () {
      if (done) return;
      card.classList.remove('is-loading');
      card.classList.add('is-live');
      frame.classList.add('is-ready');
    }, 4500);

    card.querySelector('.blogger-card__stage').appendChild(frame);
  }

  function collapseCard(c) {
    c.classList.remove('is-expanded', 'is-live', 'is-loading');
    var f = c.querySelector('.blogger-card__preview');
    if (f) f.parentNode.removeChild(f);
  }

  cards.forEach(function (card) {
    if (!card.getAttribute('data-src')) return;

    var play = card.querySelector('.blogger-card__play');
    var closeBtn = card.querySelector('.blogger-card__close');

    if (play) {
      play.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // 点开一张时，其余已展开的自动合上
        cards.forEach(function (other) {
          if (other !== card && other.classList.contains('is-expanded')) collapseCard(other);
        });

        card.classList.add('is-expanded');
        loadPreview(card);

        // 等网格重排/动画启动后再滚动到展开卡片顶部，留出 header 空隙
        setTimeout(function () {
          var header = document.querySelector('.site-header') || document.querySelector('header');
          var offset = header ? header.getBoundingClientRect().height + 12 : 20;
          var target = Math.max(0, card.getBoundingClientRect().top + window.pageYOffset - offset);
          window.scrollTo({ top: target, behavior: 'smooth' });
        }, 80);
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        collapseCard(card);
      });
    }
  });

  /* ---------- 筛选 ---------- */
  function matches(card) {
    var ok = true;
    if (activeTag !== 'all') {
      var list = (card.getAttribute('data-tags') || '').split(',');
      ok = list.indexOf(activeTag) !== -1;
    }
    if (ok && keyword) {
      ok = (card.getAttribute('data-search') || '').indexOf(keyword) !== -1;
    }
    return ok;
  }

  function syncVisible() {
    var shown = 0;
    cards.forEach(function (card) {
      var ok = matches(card);
      card.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    if (counter) counter.textContent = shown + ' / ' + cards.length + ' 个站点';
    if (emptyTip) emptyTip.hidden = shown !== 0;
  }

  function applyTag(tag, push) {
    activeTag = tag;
    tabs.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-tag') === tag); });
    syncVisible();
    if (!push) return;
    if (tag === 'all') history.replaceState(null, '', location.pathname);
    else history.replaceState(null, '', '#' + encodeURIComponent(tag));
  }

  function hasTag(tag) {
    return tabs.some(function (t) { return t.getAttribute('data-tag') === tag; });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { applyTag(tab.getAttribute('data-tag'), true); });
  });

  if (search) {
    search.addEventListener('input', function () {
      keyword = search.value.trim().toLowerCase();
      syncVisible();
    });
  }

  window.addEventListener('hashchange', function () {
    var hash = decodeURIComponent(location.hash.replace('#', ''));
    applyTag(hasTag(hash) ? hash : 'all', false);
  });

  applyTag(hasTag(decodeURIComponent(location.hash.replace('#', ''))) ? decodeURIComponent(location.hash.replace('#', '')) : 'all', false);
})();
