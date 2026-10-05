(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  }

  function mediaFor(items, section) {
    return (items || []).find(function (item) { return item.section === section && item.type === 'image'; });
  }

  function renderServices(element, services) {
    if (!element || !services || !services.length) return;
    if (element.classList.contains('editorial-services')) {
      element.innerHTML = services.map(function (item, index) {
        var number = String(index + 1).padStart(2, '0');
        return '<a href="service.html?service=' + encodeURIComponent(item.slug || '') + '">' +
          '<span>' + number + '</span><h3>' + escapeHtml(item.name) + '</h3>' +
          '<p>' + escapeHtml(item.description) + '</p>' +
          '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>';
      }).join('');
      return;
    }
    element.innerHTML = services.map(function (item) {
      return '<article class="service-card"><h2>' + escapeHtml(item.name) + '</h2><p>' + escapeHtml(item.description) + '</p><a class="text-link" href="service.html?service=' + encodeURIComponent(item.slug || '') + '">View Services <i class="fas fa-arrow-right"></i></a></article>';
    }).join('');
  }

  fetch('/api/cms').then(function (response) {
    if (!response.ok) throw new Error('CMS content unavailable.');
    return response.json();
  }).then(function (data) {
    var homepage = data.homepage || {};
    ['eyebrow', 'headline', 'body', 'positioning_statement', 'why_heading', 'why_description', 'process_heading', 'process_description', 'final_cta_heading', 'final_cta_description', 'company_description'].forEach(function (key) {
      setText('[data-cms="' + key + '"]', homepage[key]);
    });
    document.querySelectorAll('[data-cms-link]').forEach(function (link) {
      var key = link.dataset.cmsLink;
      if (homepage[key]) {
        link.textContent = homepage[key];
        link.href = homepage[key.replace('_text', '_link')] || link.href;
      }
    });
    var hero = mediaFor(data.media, 'HERO');
    var heroSlot = document.querySelector('[data-media-slot="hero"]');
    if (hero && heroSlot && hero.src) {
      heroSlot.style.backgroundImage = 'url("' + hero.src.replace(/"/g, '') + '")';
      heroSlot.classList.add('has-managed-media');
    }
    var portfolio = document.querySelector('[data-cms-list="portfolio"]');
    if (portfolio && data.portfolio && data.portfolio.length) {
      portfolio.innerHTML = data.portfolio.filter(function (item) { return item.featured; }).slice(0, 3).map(function (item) {
        return '<article class="project-card"><img loading="lazy" src="' + escapeHtml(item.cover_image) + '" alt="' + escapeHtml(item.name) + '"><div class="project-info"><span class="project-type">' + escapeHtml(item.category) + '</span><h3>' + escapeHtml(item.name) + '</h3><p>' + escapeHtml(item.description) + '</p></div></article>';
      }).join('');
    }
    renderServices(document.querySelector('[data-cms-list="services"]'), data.services);
  }).catch(function (error) {
    console.warn('Public CMS content was not loaded:', error.message);
  });
}());
