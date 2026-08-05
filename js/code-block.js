/*!
 * sail · code-block.js
 * 代码块增强：语言角标 / 一键复制 / 超长折叠
 */
(function () {
  'use strict';

  var CFG = window.SAIL || {};
  var C = CFG.code || {};
  var I18N = CFG.i18n || {};

  var scope = document.querySelector('.post__body') || document.querySelector('.page__body');
  if (!scope) return;

  // Hexo 高亮既可能是 <figure.highlight>，也可能是纯 <pre><code>
  var blocks = scope.querySelectorAll('figure.highlight, pre');

  Array.prototype.forEach.call(blocks, function (block) {
    // <figure.highlight> 内部的 pre 不重复处理
    if (block.tagName === 'PRE' && block.closest('figure.highlight')) return;
    if (block.closest('.code-block')) return;

    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    var codeEl = block.querySelector('code') || block;
    var text = getPlainCode(block);

    /* ---- 语言角标 ---- */
    if (C.lang) {
      var lang = detectLang(block, codeEl);
      if (lang) {
        var badge = document.createElement('span');
        badge.className = 'code-lang';
        badge.textContent = lang;
        wrap.appendChild(badge);
      }
    }

    /* ---- 复制 ---- */
    // Prism 的 toolbar+copy 插件已提供复制按钮，避免重复
    if (C.copy && !window.Prism) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = I18N.copy || '复制';
      btn.setAttribute('aria-label', I18N.copy || '复制');
      btn.addEventListener('click', function () {
        copy(text).then(function (ok) {
          btn.textContent = ok ? (I18N.copied || '已复制') : (I18N.error || '复制失败');
          btn.classList.toggle('is-done', ok);
          setTimeout(function () {
            btn.textContent = I18N.copy || '复制';
            btn.classList.remove('is-done');
          }, 1600);
        });
      });
      wrap.appendChild(btn);
    }

    /* ---- 折叠 ---- */
    var limit = C.foldOver || 0;
    if (limit > 0) {
      var lines = text.split('\n').length;
      if (lines > limit) {
        block.classList.add('pre--folded');
        var fold = document.createElement('button');
        fold.type = 'button';
        fold.className = 'code-fold';
        fold.textContent = (I18N.unfold || '展开') + ' · ' + lines;
        fold.setAttribute('aria-expanded', 'false');
        fold.addEventListener('click', function () {
          var folded = block.classList.toggle('pre--folded');
          fold.setAttribute('aria-expanded', String(!folded));
          fold.textContent = folded ? (I18N.unfold || '展开') + ' · ' + lines : (I18N.fold || '折叠');
          if (folded) wrap.scrollIntoView({ block: 'nearest' });
        });
        wrap.appendChild(fold);
      }
    }
  });

  /* ---------- 工具 ---------- */

  // Hexo 的 figure.highlight 会把行号渲染进表格，复制时必须剔除
  function getPlainCode(block) {
    var codeCells = block.querySelectorAll('td.code, .code .line');
    if (block.matches('figure.highlight')) {
      var lines = block.querySelectorAll('td.code .line, td.code pre .line');
      if (lines.length) {
        return Array.prototype.map.call(lines, function (l) { return l.textContent; }).join('\n');
      }
      var td = block.querySelector('td.code');
      if (td) return td.textContent.replace(/\n$/, '');
    }
    if (codeCells.length) {
      return Array.prototype.map.call(codeCells, function (l) { return l.textContent; }).join('\n');
    }
    var code = block.querySelector('code');
    return (code || block).textContent.replace(/\n$/, '');
  }

  function detectLang(block, codeEl) {
    var m =
      (block.className.match(/(?:^|\s)(?:highlight\s+)?([a-z0-9+#-]+)(?:\s|$)/i) && RegExp.$1) || '';
    var cls = codeEl.className || '';
    var lm = cls.match(/language-([a-z0-9+#-]+)/i);
    var lang = (lm && lm[1]) || block.getAttribute('data-language') || '';
    if (!lang && m && !/^(highlight|hljs|line|code)$/i.test(m)) lang = m;
    if (!lang || /^(plain|text|none)$/i.test(lang)) return '';
    return lang.toUpperCase();
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
})();
