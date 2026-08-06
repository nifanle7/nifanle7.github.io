/**
 * Gallery: tag-based filtering + scroll reveal + lightbox
 */
(function () {
  'use strict'

  var _imageObserver = null

  function createImageObserver () {
    if (!('IntersectionObserver' in window)) return null
    return new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target
          img.src = img.dataset.src
          img.removeAttribute('data-src')
          img.onload = function () {
            img.classList.add('loaded')
            var item = img.closest('.gallery-item')
            if (item) item.classList.add('gallery-item-loaded')
          }
          img.onerror = function () {
            img.classList.add('loaded')
            var item = img.closest('.gallery-item')
            if (item) item.classList.add('gallery-item-loaded')
          }
          observer.unobserve(img)
        }
      })
    }, { rootMargin: '400px 0px', threshold: 0.01 })
  }

  function observeImages () {
    var images = document.querySelectorAll('.gallery-item-image[data-src]')
    if (!images.length) return

    if (!_imageObserver) {
      _imageObserver = createImageObserver()
    }

    if (_imageObserver) {
      images.forEach(function (img) { _imageObserver.observe(img) })
    } else {
      images.forEach(function (img) {
        img.src = img.dataset.src
        img.removeAttribute('data-src')
        img.classList.add('loaded')
        var item = img.closest('.gallery-item')
        if (item) item.classList.add('gallery-item-loaded')
      })
    }
  }

  function initScrollReveal () {
    var grid = document.querySelector('.gallery-grid')
    if (!grid) return null

    var batchSize = parseInt(grid.getAttribute('data-batch-size')) || 6
    var revealObserver = null
    var activeTag = 'all'

    function getAllItems () {
      return Array.prototype.slice.call(grid.querySelectorAll('.gallery-item'))
    }

    function matchesTag (item, tag) {
      if (tag === 'all') return true
      var tags = (item.getAttribute('data-tags') || '').split(',')
      return tags.indexOf(tag) !== -1
    }

    function updateVisibility () {
      getAllItems().forEach(function (item) {
        var tagOk = matchesTag(item, activeTag)
        var loaded = !item.classList.contains('gallery-item-unloaded')
        if (tagOk && loaded) {
          item.classList.remove('gallery-item-hidden')
        } else {
          item.classList.add('gallery-item-hidden')
          var img = item.querySelector('.gallery-item-image')
          if (img && !tagOk) img.style.display = 'none'
        }
      })
    }

    function revealNextBatch () {
      var unloaded = grid.querySelectorAll('.gallery-item-unloaded')
      if (!unloaded.length) return

      var count = 0
      unloaded.forEach(function (item) {
        if (count >= batchSize) return
        if (!matchesTag(item, activeTag)) return

        item.classList.remove('gallery-item-unloaded')
        item.classList.remove('gallery-item-hidden')
        var img = item.querySelector('.gallery-item-image')
        if (img) {
          img.style.display = ''
          if (img.dataset.src) {
            if (_imageObserver) {
              _imageObserver.observe(img)
            } else {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              img.classList.add('loaded')
              var item = img.closest('.gallery-item')
              if (item) item.classList.add('gallery-item-loaded')
            }
          }
        }
        count++
      })

      setupScrollObserver()
    }

    function setupScrollObserver () {
      if (revealObserver) revealObserver.disconnect()

      var visible = grid.querySelectorAll('.gallery-item:not(.gallery-item-hidden)')
      var remaining = grid.querySelectorAll('.gallery-item-unloaded')
      if (!visible.length || !remaining.length) return

      var lastVisible = visible[visible.length - 1]
      revealObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          revealObserver.disconnect()
          revealNextBatch()
        }
      }, { rootMargin: '800px 0px', threshold: 0 })

      revealObserver.observe(lastVisible)
    }

    function applyTag (tag) {
      activeTag = tag

      getAllItems().forEach(function (item) {
        var unloaded = item.classList.contains('gallery-item-unloaded')
        var tagOk = matchesTag(item, tag)
        if (tagOk && !unloaded) {
          item.classList.remove('gallery-item-hidden')
          var img = item.querySelector('.gallery-item-image')
          if (img) img.style.display = ''
        } else {
          item.classList.add('gallery-item-hidden')
          var img = item.querySelector('.gallery-item-image')
          if (img && !tagOk) img.style.display = 'none'
        }
      })

      setupScrollObserver()
    }

    return { applyTag: applyTag }
  }

  function initTabs (reveal) {
    var tags = document.querySelectorAll('.gallery-tag')
    if (!tags.length || !reveal) return

    var initialHash = decodeURIComponent(location.hash.replace('#', ''))
    var initialTag = getTagElement(tags, initialHash) ? initialHash : 'all'

    reveal.applyTag(initialTag)
    setActiveTab(tags, initialTag)

    tags.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tag = tab.getAttribute('data-tag')
        setActiveTab(tags, tag)
        reveal.applyTag(tag)
        if (tag === 'all') {
          history.replaceState(null, '', location.pathname)
        } else {
          history.pushState(null, '', '#' + encodeURIComponent(tag))
        }
      })
    })

    window.addEventListener('hashchange', function () {
      var hash = decodeURIComponent(location.hash.replace('#', ''))
      if (getTagElement(tags, hash)) {
        setActiveTab(tags, hash)
        reveal.applyTag(hash)
      } else if (!location.hash) {
        setActiveTab(tags, 'all')
        reveal.applyTag('all')
      }
    })
  }

  function getTagElement (tags, tag) {
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].getAttribute('data-tag') === tag) return tags[i]
    }
    return null
  }

  function setActiveTab (tags, tag) {
    tags.forEach(function (t) { t.classList.remove('active') })
    var target = getTagElement(tags, tag)
    if (target) target.classList.add('active')
  }

  function initLightbox () {
    var lightbox = document.querySelector('.lightbox')
    if (!lightbox) return

    var lbImage = lightbox.querySelector('.lightbox-image')
    var lbTitle = lightbox.querySelector('.lightbox-title')
    var lbDesc = lightbox.querySelector('.lightbox-description')
    var lbCounter = lightbox.querySelector('.lightbox-counter')

    function getVisibleItems () {
      return Array.prototype.slice.call(document.querySelectorAll('.gallery-item:not(.gallery-item-hidden)'))
    }

    function showImage (item) {
      if (!item) return
      var src = item.getAttribute('data-src')
      var title = item.getAttribute('data-title') || ''
      var desc = item.getAttribute('data-description') || ''

      var allItems = getVisibleItems()
      var currentIndex = allItems.indexOf(item)

      lbImage.classList.remove('loaded')
      lbImage.src = src
      lbImage.onload = function () { lbImage.classList.add('loaded') }
      lbImage.onerror = function () { lbImage.classList.add('loaded') }
      lbImage.alt = title

      lbTitle.textContent = title
      lbDesc.textContent = desc
      lbCounter.textContent = (currentIndex + 1) + ' / ' + allItems.length
    }

    function openLightbox (item) {
      showImage(item)
      lightbox.classList.add('active')
      document.body.style.overflow = 'hidden'
    }

    function closeLightbox () {
      lightbox.classList.remove('active')
      document.body.style.overflow = ''
      setTimeout(function () {
        lbImage.src = ''
        lbImage.classList.remove('loaded')
      }, 300)
    }

    function navigate (direction) {
      var allItems = getVisibleItems()
      var currentSrc = lbImage.src
      var currentIndex = -1
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].getAttribute('data-src') === currentSrc) {
          currentIndex = i
          break
        }
      }
      if (currentIndex === -1) return
      var newIndex = (currentIndex + direction + allItems.length) % allItems.length
      showImage(allItems[newIndex])
    }

    document.addEventListener('click', function (e) {
      var item = e.target.closest('.gallery-item:not(.gallery-item-hidden)')
      if (item) openLightbox(item)
    })

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox)
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox)
    lightbox.querySelector('.lightbox-prev').addEventListener('click', function (e) { e.stopPropagation(); navigate(-1) })
    lightbox.querySelector('.lightbox-next').addEventListener('click', function (e) { e.stopPropagation(); navigate(1) })

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    })

    var touchStartX = 0
    var touchStartY = 0
    lightbox.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
    }, { passive: true })

    lightbox.addEventListener('touchend', function (e) {
      var diffX = e.changedTouches[0].screenX - touchStartX
      var diffY = e.changedTouches[0].screenY - touchStartY
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        navigate(diffX > 0 ? -1 : 1)
      }
    }, { passive: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      observeImages()
      var reveal = initScrollReveal()
      initTabs(reveal)
      initLightbox()
    })
  } else {
    observeImages()
    var reveal = initScrollReveal()
    initTabs(reveal)
    initLightbox()
  }
})()
