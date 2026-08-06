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

  var mount = host.querySelector('.giscus');
  if (!mount) return;

  var loaded = false;

  // Giscus 自定义主题 CSS（隐藏" N 条评论"计数头部，融入 sail 配色）
  // 关键：giscus.app 是 HTTPS，若用本站 HTTP 地址会被混合内容拦截而回退内置主题。
  // 故用站点 HTTPS 域名托管（经 ftpsync 部署到 uncoverman.com，预览/线上均可加载）。
  var giscusThemeUrl = {
    light: 'https://www.uncoverman.com/style/giscus-custom.css',
    dark: 'https://www.uncoverman.com/style/giscus-custom-dark.css'
  };

  function giscusTheme() {
    return document.documentElement.getAttribute('data-resolved') === 'dark'
      ? giscusThemeUrl.dark
      : giscusThemeUrl.light;
  }

  function load() {
    if (loaded) return;
    loaded = true;

    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';

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
    s.setAttribute('data-input-position', 'top');
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
