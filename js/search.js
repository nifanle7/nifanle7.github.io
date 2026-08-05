/*!
 * sail · search.js
 * 本地搜索：hexo-generator-search 的 search.xml（或 .json）
 * 面板开合 / 索引懒加载 / 中英文分词打分 / 关键词高亮 / 键盘导航
 */
(function () {
  'use strict';

  var Sail = window.Sail || {};
  var CFG = window.SAIL || {};
  var S = (CFG.search || {});
  var I18N = CFG.i18n || {};

  var panel = document.getElementById('search-panel');
  if (!panel) return;

  var input = panel.querySelector('.search-panel__input');
  var box = panel.querySelector('.search-panel__results');
  var hint = panel.querySelector('.search-panel__hint');

  var index = null;      // 索引数据
  var loading = false;   // 是否正在拉取
  var isOpen = false;
  var releaseTrap = null;
  var closeTimer = null;
  var lastOpener = null;
  var activeIdx = -1;

  /* ---------- 索引加载 ---------- */
  function loadIndex() {
    if (index || loading) return Promise.resolve(index);
    loading = true;
    return fetch(S.path, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (text) {
        index = /\.json$/.test(S.path) ? parseJSON(text) : parseXML(text);
        loading = false;
        return index;
      })
      .catch(function () {
        loading = false;
        index = [];
        hint.textContent = I18N.searchError || '搜索索引加载失败';
        return index;
      });
  }

  function parseJSON(text) {
    var arr = [];
    try { arr = JSON.parse(text); } catch (e) { return []; }
    return arr.map(function (e) {
      return normalize(e.title, e.url || e.path, e.content, e.categories, e.tags);
    });
  }

  function parseXML(text) {
    var xml = new DOMParser().parseFromString(text, 'text/xml');
    return Array.prototype.map.call(xml.querySelectorAll('entry'), function (n) {
      var get = function (sel) { var t = n.querySelector(sel); return t ? t.textContent : ''; };
      var list = function (sel) {
        return Array.prototype.map.call(n.querySelectorAll(sel), function (x) { return x.textContent; });
      };
      return normalize(get('title'), get('url'), get('content'), list('categories > category'), list('tags > tag'));
    });
  }

  function normalize(title, url, content, cats, tags) {
    var plain = String(content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: String(title || '').trim(),
      url: url || '',
      text: plain,
      lowerTitle: String(title || '').toLowerCase(),
      lowerText: plain.toLowerCase(),
      meta: [].concat(cats || [], tags || []).join(' ')
    };
  }

  /* ---------- 分词与打分 ---------- */
  // 中文无空格：把连续 CJK 串按 1~2 字滑窗拆开，兼顾"数码"这类双字词
  function tokenize(q) {
    var raw = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var out = [];
    raw.forEach(function (w) {
      out.push(w);
      if (/^[\u4e00-\u9fa5]{3,}$/.test(w)) {
        for (var i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
      }
    });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 8);
  }

  function countOf(hay, needle) {
    if (!needle) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
    return n;
  }

  function search(q) {
    var tokens = tokenize(q);
    if (!tokens.length || !index) return [];
    var hits = [];

    index.forEach(function (item) {
      var score = 0, matched = 0;
      tokens.forEach(function (t) {
        var inTitle = countOf(item.lowerTitle, t);
        var inText = countOf(item.lowerText, t);
        var inMeta = item.meta.toLowerCase().indexOf(t) !== -1 ? 1 : 0;
        if (inTitle || inText || inMeta) matched++;
        score += inTitle * 12 + inMeta * 5 + Math.min(inText, 8);
      });
      // 命中词越全排越前
      if (matched) hits.push({ item: item, score: score + matched * 20 });
    });

    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, S.limit || 20).map(function (h) { return h.item; });
  }

  /* ---------- 渲染 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, tokens) {
    var html = esc(text);
    tokens.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      html = html.replace(re, '<mark>$1</mark>');
    });
    return html;
  }

  // 摘要取第一个命中词附近的上下文，比固定截前 N 字有用
  function snippet(item, tokens) {
    var pos = -1;
    for (var i = 0; i < tokens.length; i++) {
      pos = item.lowerText.indexOf(tokens[i]);
      if (pos !== -1) break;
    }
    var start = pos > 40 ? pos - 40 : 0;
    var s = item.text.slice(start, start + 140);
    return (start > 0 ? '…' : '') + s + (item.text.length > start + 140 ? '…' : '');
  }

  function render(q) {
    var tokens = tokenize(q);
    if (!q.trim()) {
      box.innerHTML = '';
      hint.hidden = false;
      hint.textContent = I18N.hint || '输入关键词开始搜索';
      activeIdx = -1;
      return;
    }
    var results = search(q);
    activeIdx = -1;

    if (!results.length) {
      box.innerHTML = '';
      hint.hidden = false;
      hint.textContent = I18N.empty || '没有找到相关文章';
      return;
    }

    hint.hidden = false;
    hint.textContent = results.length + ' ' + (I18N.results || '条结果');
    box.innerHTML = results.map(function (r) {
      return '<a class="search-result" href="' + esc(r.url) + '">' +
             '<div class="search-result__title">' + highlight(r.title, tokens) + '</div>' +
             '<div class="search-result__excerpt">' + highlight(snippet(r, tokens), tokens) + '</div>' +
             '</a>';
    }).join('');
  }

  /* ---------- 开合 ---------- */
  function open(opener) {
    if (isOpen) return;
    isOpen = true;
    lastOpener = opener || document.activeElement;
    clearTimeout(closeTimer);
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    if (Sail.lockScroll) Sail.lockScroll();
    if (Sail.trapFocus) releaseTrap = Sail.trapFocus(panel);
    input.focus();
    input.select();
    loadIndex().then(function () {
      if (input.value.trim()) render(input.value);
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    if (Sail.unlockScroll) Sail.unlockScroll();
    closeTimer = setTimeout(function () { panel.hidden = true; }, 220);
    if (lastOpener && lastOpener.focus) lastOpener.focus();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest && e.target.closest('[data-search-open]');
    if (opener) { e.preventDefault(); open(opener); return; }
    if (e.target.closest && e.target.closest('[data-search-close]')) { e.preventDefault(); close(); }
  });

  // 悬停即预热索引，点开时几乎无等待
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest && e.target.closest('[data-search-open]')) loadIndex();
  }, { passive: true, once: true });

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var v = input.value;
    timer = setTimeout(function () {
      if (!index) { hint.textContent = I18N.searching || '搜索中…'; loadIndex().then(function () { render(v); }); }
      else render(v);
    }, 140);
  });

  /* ---------- 键盘 ---------- */
  function items() { return box.querySelectorAll('.search-result'); }

  function move(delta) {
    var list = items();
    if (!list.length) return;
    if (activeIdx >= 0 && list[activeIdx]) list[activeIdx].classList.remove('is-active');
    activeIdx = (activeIdx + delta + list.length) % list.length;
    var el = list[activeIdx];
    el.classList.add('is-active');
    el.scrollIntoView({ block: 'nearest' });
  }

  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var list = items();
      var target = activeIdx >= 0 ? list[activeIdx] : list[0];
      if (target) { e.preventDefault(); location.href = target.href; }
    }
  });

  // Cmd/Ctrl + K 呼出
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen ? close() : open(document.querySelector('[data-search-open]'));
    }
  });
})();
