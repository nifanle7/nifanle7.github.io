/*!
 * sail · infinite-scroll.js
 * 文章列表页「下滑加载」：接管分页，滚动到底自动抓取下一页并追加
 * ------------------------------------------------------------------
 * 渐进增强：HTML 仍然输出 /posts/page/N/ 分页链接（无 JS / 爬虫可用），
 * 本脚本在运行时把分页条换成哨兵 + 状态条，失败时回落为「加载更多」按钮。
 */
(function () {
  'use strict';

  var I18N = (window.SAIL || {}).i18n || {};
  var T = {
    loading: I18N.loading || '加载中…',
    noMore: I18N.noMore || '没有更多了',
    loadMore: I18N.loadMore || '加载更多',
    failed: I18N.loadFailed || '加载失败，点击重试'
  };

  var root = document.querySelector('[data-infinite-root]');
  var pager = document.querySelector('[data-infinite-pager]');
  if (!root || !pager) return;

  var list = root.querySelector('.post-list');
  if (!list) return;

  var nextUrl = pager.getAttribute('data-next') || '';
  var loading = false;
  var failed = false;

  // 分页条交给脚本接管
  pager.hidden = true;

  var status = document.createElement('div');
  status.className = 'infinite';
  status.innerHTML =
    '<div class="infinite__sentinel" aria-hidden="true"></div>' +
    '<button class="infinite__btn" type="button" hidden></button>' +
    '<p class="infinite__msg" role="status" aria-live="polite"></p>';
  pager.parentNode.insertBefore(status, pager.nextSibling);

  var sentinel = status.querySelector('.infinite__sentinel');
  var btn = status.querySelector('.infinite__btn');
  var msg = status.querySelector('.infinite__msg');

  function setMsg(text, spinning) {
    msg.textContent = text || '';
    status.classList.toggle('is-loading', !!spinning);
  }

  function finish() {
    nextUrl = '';
    if (observer) observer.disconnect();
    sentinel.remove();
    btn.hidden = true;
    setMsg(T.noMore, false);
    status.classList.add('is-done');
  }

  function fail() {
    failed = true;
    loading = false;
    setMsg('', false);
    btn.hidden = false;
    btn.textContent = T.failed;
    status.classList.add('is-failed');
  }

  function load() {
    if (loading || !nextUrl) return;
    loading = true;
    failed = false;
    status.classList.remove('is-failed');
    btn.hidden = true;
    setMsg(T.loading, true);

    var url = nextUrl;
    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var incoming = doc.querySelector('[data-infinite-root] .post-list');
        var items = incoming ? Array.prototype.slice.call(incoming.children) : [];

        if (!items.length) return finish();

        var frag = document.createDocumentFragment();
        items.forEach(function (node) {
          node.classList.add('is-appended');
          frag.appendChild(node);
        });
        list.appendChild(frag);

        // 下一页地址取自新页面的分页条
        var nextPager = doc.querySelector('[data-infinite-pager]');
        nextUrl = (nextPager && nextPager.getAttribute('data-next')) || '';

        loading = false;
        if (!nextUrl) return finish();

        setMsg('', false);
        // 追加后重新观察哨兵（内容变高，可能仍在视口内）
        if (observer) {
          observer.unobserve(sentinel);
          observer.observe(sentinel);
        }
      })
      .catch(function () {
        // 回退：交给用户手动重试，不打断浏览
        fail();
      });
  }

  btn.addEventListener('click', function () {
    if (failed || !loading) load();
  });

  var observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !failed) load();
    }, { rootMargin: '600px 0px', threshold: 0 });
    observer.observe(sentinel);
  } else {
    // 老浏览器：显示「加载更多」按钮
    sentinel.remove();
    btn.hidden = false;
    btn.textContent = T.loadMore;
  }

  if (!nextUrl) finish();
})();
