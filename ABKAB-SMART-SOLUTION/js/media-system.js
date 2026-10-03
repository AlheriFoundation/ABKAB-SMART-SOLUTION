(function (window, document) {
  'use strict';

  var mediaRoot = 'images/media/';
  var mediaLibrary = {
    hero: { image: '', video: '', poster: '', alt: '' },
    inAction: [],
    portfolio: [],
    founder: { image: '', name: '', title: '', story: '', message: '' }
  };

  function createImage(item) {
    if (!item || !item.src) return null;
    var image = document.createElement('img');
    image.src = item.src.indexOf('/') === 0 || item.src.indexOf('://') > -1 ? item.src : mediaRoot + item.src;
    image.alt = item.alt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.className = 'media-image media-reveal';
    return image;
  }

  function createVideo(item) {
    if (!item || !item.src) return null;
    var video = document.createElement('video');
    video.className = 'media-video media-reveal';
    video.controls = true;
    video.preload = 'none';
    video.playsInline = true;
    if (item.poster) video.poster = item.poster;
    var source = document.createElement('source');
    source.src = item.src.indexOf('/') === 0 || item.src.indexOf('://') > -1 ? item.src : mediaRoot + item.src;
    source.type = item.type || 'video/mp4';
    video.appendChild(source);
    return video;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-media-slot]').forEach(function (slot) {
      slot.classList.add('media-slot-ready');
    });
  });

  window.ABKABMedia = {
    root: mediaRoot,
    library: mediaLibrary,
    createImage: createImage,
    createVideo: createVideo
  };
}(window, document));
