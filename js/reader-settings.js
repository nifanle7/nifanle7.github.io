/*!
 * sail · reader-settings.js
 * 阅读设置：字体 / 字号 / 行距 / 版心宽度，记忆到 localStorage
 * 仅在文章、独立页出现；面板由脚本创建（无 JS 时不占位）
 */
(function () {
  'use strict';

  var CFG = window.SAIL || {};
  var I18N = CFG.i18n || {};
  var R = CFG.reader || {};

  var article = document.querySelector('.post__body, .page__body');
  if (!R.enable || !article) return;

  var KEY = R.key || 'sail-reader';
  var doc = document.documentElement;

  var SCHEMA = [
    {
      id: 'font', label: I18N.fontFamily || '字体', def: 'serif',
      options: [
        { v: 'serif', t: I18N.serif || '衬线' },
        { v: 'sans', t: I18N.sans || '黑体' }
      ]
    },
    {
      id: 'size', label: I18N.fontSize || '字号', def: 'md',
      options: [
        { v: 'sm', t: I18N.small || '小' },
        { v: 'md', t: I18N.medium || '中' },
        { v: 'lg', t: I18N.large || '大' }
      ]
    },
    {
      id: 'leading', label: I18N.lineHeight || '行距', def: 'md',
      options: [
        { v: 'sm', t: I18N.small || '小' },
        { v: 'md', t: I18N.medium || '中' },
        { v: 'lg', t: I18N.large || '大' }
      ]
    },
    {
      id: 'width', label: I18N.width || '版心', def: 'md',
      options: [
        { v: 'sm', t: I18N.narrow || '窄' },
        { v: 'md', t: I18N.medium || '中' },
        { v: 'lg', t: I18N.wide || '宽' }
      ]
    }
  ];

  var state = load();

  function load() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    var out = {};
    SCHEMA.forEach(function (f) {
      var ok = f.options.some(function (o) { return o.v === saved[f.id]; });
      out[f.id] = ok ? saved[f.id] : f.def;
    });
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // 全部走 data-* 属性，具体数值交给 CSS，方便主题定制
  function apply() {
    SCHEMA.forEach(function (f) { doc.setAttribute('data-reader-' + f.id, state[f.id]); });
  }

  apply();

  /* ---------- 面板 ---------- */
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'reader-settings-btn';
  btn.setAttribute('aria-label', I18N.settings || '阅读设置');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h9M17 17h3"/>' +
    '<circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="15" cy="17" r="2"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'reader-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', I18N.settings || '阅读设置');
  panel.innerHTML =
    '<div class="reader-panel__title">' + (I18N.settings || '阅读设置') + '</div>' +
    SCHEMA.map(function (f) {
      return '<div class="reader-panel__row"><span>' + f.label + '</span>' +
        '<span class="reader-panel__seg" data-field="' + f.id + '">' +
        f.options.map(function (o) {
          return '<button type="button" data-value="' + o.v + '"' +
                 (state[f.id] === o.v ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"') +
                 '>' + o.t + '</button>';
        }).join('') +
        '</span></div>';
    }).join('') +
    '<button type="button" class="reader-panel__reset">' + (I18N.reset || '恢复默认') + '</button>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  function toggle(force) {
    var show = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
  }

  btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });

  panel.addEventListener('click', function (e) {
    e.stopPropagation();

    if (e.target.closest('.reader-panel__reset')) {
      SCHEMA.forEach(function (f) { state[f.id] = f.def; });
      save(); apply(); sync();
      return;
    }

    var b = e.target.closest('.reader-panel__seg button');
    if (!b) return;
    var field = b.parentElement.getAttribute('data-field');
    state[field] = b.getAttribute('data-value');
    save(); apply(); sync();
  });

  function sync() {
    Array.prototype.forEach.call(panel.querySelectorAll('.reader-panel__seg'), function (seg) {
      var field = seg.getAttribute('data-field');
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
        var on = b.getAttribute('data-value') === state[field];
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
  }

  document.addEventListener('click', function () { if (!panel.hidden) toggle(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); }
  });
})();
