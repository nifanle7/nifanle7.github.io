/*!
 * sail · core.js
 * 主题切换 / 滚动行为 / 阅读进度 / 滚动揭示 / LQIP / 预取
 * 无依赖，defer 加载。所有能力按 window.SAIL 配置开关。
 */
(function () {
  'use strict';

  var CFG = window.SAIL || {};
  var doc = document.documentElement;
  var mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var conn = navigator.connection || {};
  var saveData = !!(CFG.perf && CFG.perf.saveData && conn.saveData);

  // 运动降级：系统偏好 + 省流模式 + 配置总开关
  var motionOff =
    !(CFG.motion && CFG.motion.enable) ||
    (CFG.motion.respect && mqReduce.matches) ||
    saveData;

  /* 供其它脚本复用的极简工具 ------------------------------------ */
  var Sail = (window.Sail = window.Sail || {});
  Sail.cfg = CFG;
  Sail.motionOff = motionOff;
  Sail.saveData = saveData;

  Sail.rafThrottle = function (fn) {
    var queued = false, lastArgs;
    return function () {
      lastArgs = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn.apply(null, lastArgs);
      });
    };
  };

  Sail.emit = function (name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  };

  // 焦点陷阱：抽屉 / 搜索面板 / 灯箱共用
  var FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  Sail.trapFocus = function (container) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(
        container.querySelectorAll(FOCUSABLE),
        function (el) { return el.offsetParent !== null; }
      );
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  };

  // 滚动锁（记录 scrollY，解锁后原位恢复；避免 iOS 回弹跳顶）
  var lockCount = 0, lockedY = 0;
  Sail.lockScroll = function () {
    if (lockCount++) return;
    lockedY = window.scrollY;
    var sbw = window.innerWidth - doc.clientWidth;
    document.body.style.cssText +=
      ';position:fixed;top:' + -lockedY + 'px;left:0;right:0;width:100%;' +
      (sbw > 0 ? 'padding-right:' + sbw + 'px;' : '');
  };
  Sail.unlockScroll = function () {
    if (!lockCount || --lockCount) return;
    var s = document.body.style;
    s.position = s.top = s.left = s.right = s.width = s.paddingRight = '';
    window.scrollTo(0, lockedY);
  };

  /* ============ 1. 主题（浅 / 深 / 跟随系统）============ */
  var TKEY = (CFG.theme && CFG.theme.key) || 'sail-theme';
  var TDEF = (CFG.theme && CFG.theme.def) || 'auto';

  // 用户偏好只有三种；任何历史遗留 / 手改出来的非法值都归一到 light，避免样式落空
  var MODES = ['light', 'dark', 'auto'];
  function normalizeMode(mode) {
    return MODES.indexOf(mode) === -1 ? 'light' : mode;
  }
  // 解析结果只有 light / dark 两种，样式层只认它
  function resolveTheme(mode) {
    mode = normalizeMode(mode);
    return mode === 'auto' ? (mqDark.matches ? 'dark' : 'light') : mode;
  }
  function currentMode() {
    return normalizeMode(doc.getAttribute('data-theme') || TDEF);
  }
  function applyTheme(mode, persist) {
    mode = normalizeMode(mode);
    var resolved = resolveTheme(mode);
    doc.setAttribute('data-theme', mode);
    doc.setAttribute('data-resolved', resolved);
    if (persist) { try { localStorage.setItem(TKEY, mode); } catch (e) {} }
    Sail.emit('sail:theme', { mode: mode, resolved: resolved });
  }
  Sail.theme = { current: currentMode, resolve: resolveTheme, apply: applyTheme };

  // head 内联脚本只写了 data-theme，这里补齐 data-resolved
  applyTheme(currentMode(), false);

  // 跟随系统时，系统切换要实时响应
  var onSchemeChange = function () {
    if (currentMode() === 'auto') applyTheme('auto', false);
  };
  mqDark.addEventListener ? mqDark.addEventListener('change', onSchemeChange)
                          : mqDark.addListener(onSchemeChange);

  // 点击：在 浅 / 深 之间切换（首次点击把 auto 落到与当前相反的一侧）
  // Alt/Option + 点击：恢复"跟随系统"
  // 具体色值由配置决定（theme_color.preset / light / dark），此处不感知任何配色方案
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    if (e.altKey) { applyTheme('auto', true); return; }
    applyTheme(resolveTheme(currentMode()) === 'dark' ? 'light' : 'dark', true);
  });

  /* ============ 2. 滚动：头部收起 / 返回顶部 / 阅读进度 ============ */
  var header = document.querySelector('.site-header');
  var backTop = document.querySelector('.back-to-top');
  var progressBar = document.querySelector('.reading-progress__bar');
  var postBody = document.querySelector('.post__body');
  var hideOnScroll = !!(CFG.nav && CFG.nav.hideOnScroll);
  var lastY = window.scrollY;
  var HEADER_H = 64;
  var backTopVisible = false, backTopTimer = null;

  function showBackTop(show) {
    if (!backTop || show === backTopVisible) return;
    backTopVisible = show;
    clearTimeout(backTopTimer);
    if (show) {
      backTop.hidden = false;
      requestAnimationFrame(function () { backTop.classList.add('is-visible'); });
    } else {
      backTop.classList.remove('is-visible');
      backTopTimer = setTimeout(function () { backTop.hidden = true; }, 240);
    }
  }

  function onScroll() {
    var y = window.scrollY;

    if (header && hideOnScroll) {
      // 抽屉 / 面板打开时不动头部，避免视觉跳动
      var locked = document.body.style.position === 'fixed';
      if (!locked) {
        if (y > lastY && y > HEADER_H * 2) header.classList.add('is-hidden');
        else header.classList.remove('is-hidden');
      }
    }

    if (backTop) showBackTop(y > window.innerHeight * 0.8);

    if (progressBar && postBody) {
      var rect = postBody.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var passed = -rect.top;
      var pct = total > 0 ? Math.min(1, Math.max(0, passed / total)) : (passed >= 0 ? 1 : 0);
      progressBar.style.width = (pct * 100).toFixed(2) + '%';
    }

    lastY = y;
  }

  var onScrollThrottled = Sail.rafThrottle(onScroll);
  window.addEventListener('scroll', onScrollThrottled, { passive: true });
  window.addEventListener('resize', onScrollThrottled, { passive: true });
  onScroll();

  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: motionOff ? 'auto' : 'smooth' });
    });
  }

  /* ============ 3. 滚动揭示 ============ */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (motionOff || !CFG.motion.reveal || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-visible'); });
    } else {
      doc.style.setProperty('--reveal-distance', CFG.motion.distance || '12px');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en, i) {
          if (!en.isIntersecting) return;
          // 同屏元素依次浮出，避免整片同时闪现
          en.target.style.transitionDelay = Math.min(i, 5) * 40 + 'ms';
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
    }
  }

  /* ============ 4. 图片：LQIP 淡入 + 桌面端限高 ============ */
  function markLoaded(img) { img.classList.add('is-loaded'); }
  Array.prototype.forEach.call(document.querySelectorAll('img[data-lqip]'), function (img) {
    if (img.complete && img.naturalWidth) markLoaded(img);
    else img.addEventListener('load', function () { markLoaded(img); }, { once: true });
    img.addEventListener('error', function () { markLoaded(img); }, { once: true });
  });

  /* ============ 5. 内链预取（hover / 视口内，省流模式关闭）============ */
  if (CFG.perf && CFG.perf.prefetch && !saveData) {
    var prefetched = {};
    var supportsPrefetch = (function () {
      var l = document.createElement('link');
      return l.relList && l.relList.supports && l.relList.supports('prefetch');
    })();

    function prefetch(href) {
      if (!supportsPrefetch || !href || prefetched[href]) return;
      prefetched[href] = 1;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    }

    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.origin !== location.origin) return;
      if (a.pathname === location.pathname) return;
      prefetch(a.href);
    }, { passive: true });
  }

  /* ============ 6. 全局快捷键 ============ */
  document.addEventListener('keydown', function (e) {
    // Esc 由各浮层自行处理；这里只做 "/" 聚焦搜索
    if (e.key !== '/' || !(CFG.search && CFG.search.hotkey)) return;
    var t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    var opener = document.querySelector('[data-search-open]');
    if (opener) { e.preventDefault(); opener.click(); }
  });
})();
