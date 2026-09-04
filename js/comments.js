/*!
 * sail · comments.js
 * 评论：滚动到附近才加载（不拖慢首屏）+ 深浅色跟随主题切换
 */
(function () {
  'use strict';

  var host = document.getElementById('comments');
  if (!host) return;

  var provider = host.getAttribute('data-comment-provider');
  if (provider !== 'giscus') return; // utterances 已在模板内联

  var wrapper = host.querySelector('.giscus-wrapper');
  var mount = host.querySelector('.giscus');
  if (!mount) return;

  var state = wrapper && wrapper.querySelector('[data-giscus-state]');
  var stateText = state && state.querySelector('.giscus__state-text');
  var loaded = false;
  var loadTimer = null;
  var LOAD_TIMEOUT = 15000;

  // Giscus 自定义主题 CSS（隐藏" N 条评论"计数头部，融入 sail 配色）
  // 注意：giscus.app 是 HTTPS，自定义 CSS 也必须是 HTTPS；HTTP 地址会因混合内容被拦截。
  // 默认使用相对路径 /style/...css，线上 HTTPS 站点可直接加载；本地 HTTP 预览请改用 HTTPS 服务，
  // 或在 _config.yml 的 comment.giscus.theme_url_light/theme_url_dark 里填线上已部署的 HTTPS URL。
  function resolveThemeUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    // 相对路径必须基于当前页面转成绝对 URL；
    // giscus 在 iframe 内加载，相对路径会被解析为 giscus.app，导致 404。
    try {
      return new URL(url, location.href).href;
    } catch (e) {
      return url;
    }
  }

  var giscusThemeUrl = {
    light: resolveThemeUrl(mount.getAttribute('data-theme-url-light') || '/style/giscus-custom.css'),
    dark: resolveThemeUrl(mount.getAttribute('data-theme-url-dark') || '/style/giscus-custom-dark.css')
  };

  function setState(isError, text) {
    if (!state) return;
    state.classList.toggle('is-error', !!isError);
    if (stateText && text) stateText.textContent = text;
  }

  function markLoaded() {
    // 加载成功：遮罩默认隐藏，无需操作；仅清掉超时计时器
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
  }

  function markError() {
    if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
    var I18N = (window.SAIL || {}).i18n || {};
    setState(true, I18N.giscusError || '评论加载失败，请检查网络后刷新重试');
  }

  function giscusTheme() {
    return document.documentElement.getAttribute('data-resolved') === 'dark'
      ? giscusThemeUrl.dark
      : giscusThemeUrl.light;
  }

  function load() {
    if (loaded) return;
    loaded = true;

    // 启动加载超时检测：giscus 正常加载后会通过 postMessage 触发 resize/discussion 等事件
    loadTimer = setTimeout(markError, LOAD_TIMEOUT);

    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';

    s.onerror = markError;

    var map = {
      'data-repo': 'repo',
      'data-repo-id': 'repoId',
      'data-category': 'category',
      'data-category-id': 'categoryId',
      'data-mapping': 'mapping',
      'data-lang': 'lang'
    };
    Object.keys(map).forEach(function (attr) {
      var v = mount.getAttribute(attr);
      if (v) s.setAttribute(attr, v);
    });

    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'bottom');
    s.setAttribute('data-theme', giscusTheme());
    s.setAttribute('data-loading', 'lazy');

    mount.appendChild(s);
  }

  // 距离视口一屏时开始加载
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        load();
        io.disconnect();
      }
    }, { rootMargin: '400px 0px' });
    io.observe(host);
  } else {
    load();
  }

  // giscus 加载成功后会在 iframe 内向父页面 postMessage（resize / discussion 等）
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://giscus.app') return;
    if (e.data && typeof e.data === 'object' && e.data.giscus) {
      markLoaded();
    }
  });

  // 主题切换时通知 giscus iframe 同步换肤
  document.addEventListener('sail:theme', function () {
    var frame = document.querySelector('iframe.giscus-frame');
    if (!frame) return;
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: giscusTheme() } } },
      'https://giscus.app'
    );
  });
})();
