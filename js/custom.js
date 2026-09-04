/* =============================================================================
 * custom.js —— 用户自定义脚本（全局生效）
 * -----------------------------------------------------------------------------
 * 本文件由主题原样拷贝到站点根目录（/js/custom.js），并在「主题脚本之后」以
 * defer 方式载入，因此运行时可以访问主题暴露的全局对象与 DOM。
 *
 * 用法：
 *   1. 直接在本文件中按需追加 JS 并保存。
 *   2. 重新构建博客（hexo generate）后即可生效；本地预览刷新即可。
 *   3. 若不想启用，可在主题 _config.yml 中将 custom.js 设为 false。
 *
 * 可用全局对象：
 *   - window.SAIL        主题运行时配置（主题色、动效、搜索、评论等开关）
 *   - document          标准 DOM API
 *   - 主题已加载的库（如 Prism、lightbox 等，视页面而定）
 *
 * 注意：本文件以 defer 载入，DOM 已解析完成，一般无需再包 DOMContentLoaded；
 *       若需等待全部资源（含图片）加载完，可监听 window.load。
 * ========================================================================== */

(function () {
  'use strict';

  // —— 示例 1：在控制台打印主题运行时配置（调试用，可删）——
  // console.log('[custom] SAIL runtime =', window.SAIL);

  // —— 示例 2：给所有外链新窗口打开（若主题未覆盖到你需要的场景）——
  /*
  document.querySelectorAll('a[href^="http"]:not([href*="your-domain.com"])')
    .forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  */

  // —— 示例 3：页面加载完成后执行自定义逻辑 ——
  /*
  window.addEventListener('load', function () {
    // your code here
  });
  */
})();
