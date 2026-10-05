document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var detailScript = document.createElement('script');
  detailScript.src = 'js/admin-request-details.js';
  document.body.appendChild(detailScript);

  var loginPanel = document.getElementById('loginPanel');
  var dashboard = document.getElementById('dashboard');
  var loginStatus = document.getElementById('loginStatus');
  var adminStatus = document.getElementById('adminStatus');
  var requests = [];
  var statuses = ['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  document.getElementById('logoutButton').textContent = 'Log Out';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function call(url, options) {
    return fetch(url, Object.assign({ credentials: 'same-origin' }, options || {})).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { error: text }; }
        if (!response.ok) {
          var requestError = new Error(data.error || 'Request failed.');
          requestError.status = response.status;
          requestError.responseBody = data;
          throw requestError;
        }
        return data;
      });
    }).catch(function (error) {
      if (error instanceof TypeError) throw new Error('Unable to reach the Admin service. Please try again.');
      throw error;
    });
  }

  function label(value) {
    return String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function (character) { return character.toUpperCase(); });
  }

  function setStatus(message, error) {
    adminStatus.textContent = message;
    adminStatus.className = 'form-status' + (error ? ' error' : '');
  }

  function showPanel(name) {
    document.querySelectorAll('.admin-panel').forEach(function (panel) { panel.hidden = panel.dataset.section !== name; });
    document.querySelectorAll('.admin-nav button').forEach(function (button) { button.classList.toggle('active', button.dataset.panel === name); });
    if (name !== 'requests' && name !== 'dashboard') loadCms(name);
  }

  function renderRequests() {
    var query = document.getElementById('requestSearch').value.toLowerCase();
    var filter = document.getElementById('statusFilter').value;
    var list = requests.filter(function (item) {
      return (!query || [item.request_id, item.customer_name, item.phone, item.email, item.service_type].join(' ').toLowerCase().includes(query)) && (!filter || item.status === filter);
    });
    list.sort(function (a, b) { return (document.getElementById('sortOrder').value === 'oldest' ? 1 : -1) * (new Date(a.created_at) - new Date(b.created_at)); });
    var counts = {};
    requests.forEach(function (item) { counts[item.status] = (counts[item.status] || 0) + 1; });
    document.getElementById('stats').innerHTML = ['Total Requests'].concat(statuses).map(function (key) {
      return '<div class="admin-stat"><strong>' + (key === 'Total Requests' ? requests.length : counts[key] || 0) + '</strong><span>' + label(key) + '</span></div>';
    }).join('');
    document.getElementById('requestList').innerHTML = list.map(function (item) {
      return '<article class="admin-request"><div><strong>' + esc(item.request_id) + '</strong><span>' + esc(item.customer_name) + ' · ' + esc(item.service_type) + '</span><small>' + esc(item.phone) + ' · ' + esc(item.email) + '</small><small>Submitted ' + new Date(item.created_at).toLocaleString() + '</small></div><label>Status<select data-status="' + esc(item.request_id) + '">' + statuses.map(function (status) { return '<option ' + (status === item.status ? 'selected' : '') + '>' + status + '</option>'; }).join('') + '</select></label><label>Customer-facing note<textarea data-customer="' + esc(item.request_id) + '">' + esc(item.customer_note) + '</textarea></label><label>Private admin note<textarea data-admin="' + esc(item.request_id) + '">' + esc(item.admin_notes) + '</textarea></label><div class="admin-request-actions"><button class="btn btn-primary" type="button" data-save-request="' + esc(item.request_id) + '">Update Request</button></div></article>';
    }).join('') || '<p class="form-status">No requests match these filters.</p>';
  }

  function loadRequests() {
    return call('/api/admin-requests').then(function (data) {
      if (!Array.isArray(data.requests)) throw new Error('The Admin service returned an invalid requests response.');
      requests = data.requests;
      renderRequests();
      return data;
    }).catch(function (error) {
      // Keep the server's real error visible; do not make a backend failure
      // look like an empty, successfully loaded request list.
      if (error.status !== 401) setStatus(error.message || 'Unable to load requests.', true);
      throw error;
    });
  }

  function formObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) { if (key !== 'id') data[key] = value; });
    form.querySelectorAll('input[type="checkbox"]').forEach(function (input) { data[input.name] = input.checked; });
    return data;
  }

  function fillForm(form, item) {
    if (!form) return;
    Object.keys(item || {}).forEach(function (key) {
      var field = form.elements[key];
      if (field) field.type === 'checkbox' ? field.checked = !!item[key] : field.value = item[key] || '';
    });
  }

  function save(key, data, button, form) {
    if (form && !form.reportValidity()) return Promise.reject(new Error('Complete the required fields first.'));
    var originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = key === 'homepage' && data.status === 'PUBLISHED' ? 'Publishing…' : 'Saving…';
    setStatus(button.textContent, false);
    return call('/api/admin-cms', {
      method: data.id ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ resource: key }, data))
    }).then(function () {
      setStatus(data.status === 'PUBLISHED' ? 'Published successfully.' : 'Saved successfully.', false);
      return loadCms(key);
    }).catch(function (error) {
      setStatus(error.message || 'Save failed. Please try again.', true);
      throw error;
    }).finally(function () {
      button.disabled = false;
      button.textContent = originalLabel;
    });
  }

  function ensureSettingsForm() {
    var panel = document.querySelector('[data-section="settings"]');
    if (!panel || panel.querySelector('#settingsForm')) return;
    panel.innerHTML = '<div class="panel-heading"><div><span class="eyebrow">Site settings</span><h2>Publishing defaults</h2></div></div><form id="settingsForm" class="cms-form"><input type="hidden" name="id"><div class="form-grid"><div class="field"><label>Setting name<input name="name" required></label></div><div class="field"><label>Status<select name="status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label></div><div class="field full"><label>Value<textarea name="value" required></textarea></label></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Save Setting</button><button class="btn btn-secondary" type="button" data-clear="settingsForm">Clear</button></div></form><div id="settingsList" class="cms-list"></div>';
    var form = document.getElementById('settingsForm');
    form.addEventListener('submit', function (event) { event.preventDefault(); var data = formObject(form); data.id = form.elements.id.value; save('settings', data, event.submitter || form.querySelector('button'), form).catch(function () {}); });
    panel.querySelector('[data-clear="settingsForm"]').addEventListener('click', function () { form.reset(); form.elements.id.value = ''; });
  }

  function loadCms(key) {
    var map = { homepage: 'homepage', media: 'media', portfolio: 'portfolio', services: 'services', settings: 'settings' };
    if (!map[key]) return Promise.resolve();
    if (key === 'settings') ensureSettingsForm();
    return call('/api/admin-cms?resource=' + map[key]).then(function (data) {
      var items = data.items || [];
      if (key === 'homepage') fillForm(document.getElementById('homepageForm'), items[0] || {});
      if (key === 'media' || key === 'portfolio' || key === 'services' || key === 'settings') renderCmsList(key, items);
      return data;
    }).catch(function (error) {
      setStatus(error.message || 'Unable to load CMS content. Please try again.', true);
      throw error;
    });
  }

  function renderCmsList(key, items) {
    var element = document.getElementById(key + 'List');
    if (!element) return;
    element.innerHTML = items.map(function (item) {
      return '<article class="cms-item"><div><strong>' + esc(item.name || item.title || item.headline || item.src || 'Setting') + '</strong><small>' + esc(item.category || item.section || item.status || item.value || '') + '</small></div><div class="cms-item-actions"><button class="btn btn-secondary" type="button" data-edit-cms="' + key + '" data-item="' + esc(JSON.stringify(item)) + '">Edit</button><button class="btn btn-secondary" type="button" data-delete-cms="' + key + '" data-id="' + esc(item.id) + '">Delete</button></div></article>';
    }).join('') || '<p class="form-status">No items yet.</p>';
  }

  function start() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadRequests().catch(function () {});
  }

  document.querySelectorAll('.admin-nav button').forEach(function (button) { button.addEventListener('click', function () { showPanel(button.dataset.panel); }); });
  document.getElementById('requestList').addEventListener('click', function (event) {
    var button = event.target.closest('[data-save-request]');
    if (!button) return;
    var card = button.closest('.admin-request');
    button.disabled = true;
    call('/api/admin-requests', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: button.dataset.saveRequest, status: card.querySelector('[data-status]').value, customerNote: card.querySelector('[data-customer]').value, adminNotes: card.querySelector('[data-admin]').value }) }).then(function () { setStatus('Request updated.', false); return loadRequests(); }).catch(function (error) { setStatus(error.message, true); }).finally(function () { button.disabled = false; });
  });
  ['requestSearch', 'statusFilter', 'sortOrder'].forEach(function (id) { document.getElementById(id).addEventListener('input', renderRequests); });

  document.querySelectorAll('[data-save="homepage"]').forEach(function (button) { button.addEventListener('click', function () { var form = document.getElementById('homepageForm'); var data = formObject(form); data.id = form.elements.id.value; data.status = button.dataset.status; save('homepage', data, button, form).catch(function () {}); }); });

  var mediaUrlField = document.querySelector('#mediaForm [name="src"]');
  if (mediaUrlField) mediaUrlField.required = false;
  ['media', 'portfolio', 'services'].forEach(function (key) {
    var form = document.getElementById(key === 'media' ? 'mediaForm' : key === 'portfolio' ? 'portfolioForm' : 'servicesForm');
    var statusField = document.createElement('div');
    statusField.className = 'field';
    statusField.innerHTML = '<label>Publishing status<select name="status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>';
    form.querySelector('.form-grid').appendChild(statusField);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = formObject(form);
      data.id = form.elements.id.value;
      if (key === 'media') {
        var file = document.getElementById('mediaFile').files[0];
        if (file) {
          if (file.size > 3500000 || !/^image\/(jpeg|png|webp)$/.test(file.type)) { setStatus('Use a JPG, PNG or WEBP image under 3.5 MB.', true); return; }
          var reader = new FileReader();
          reader.onload = function () { data.src = reader.result; save(key, data, event.submitter || form.querySelector('button'), form).catch(function () {}); };
          reader.onerror = function () { setStatus('The selected image could not be read.', true); };
          reader.readAsDataURL(file);
          return;
        }
        if (!data.src) { setStatus('Choose an image file or enter an image URL.', true); return; }
      }
      save(key, data, event.submitter || form.querySelector('button'), form).catch(function () {});
    });
  });

  document.addEventListener('click', function (event) {
    var edit = event.target.closest('[data-edit-cms]');
    var remove = event.target.closest('[data-delete-cms]');
    if (edit) {
      var key = edit.dataset.editCms;
      var item = JSON.parse(edit.dataset.item);
      var form = document.getElementById(key === 'media' ? 'mediaForm' : key === 'portfolio' ? 'portfolioForm' : key === 'services' ? 'servicesForm' : 'settingsForm');
      if (!form && key === 'settings') { ensureSettingsForm(); form = document.getElementById('settingsForm'); }
      fillForm(form, item);
      return;
    }
    if (remove) {
      if (!confirm('Delete this item?')) return;
      call('/api/admin-cms', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resource: remove.dataset.deleteCms, id: remove.dataset.id }) }).then(function () { setStatus('Deleted successfully.', false); return loadCms(remove.dataset.deleteCms); }).catch(function (error) { setStatus(error.message || 'Unable to delete this item.', true); });
    }
  });

  document.querySelectorAll('[data-clear]').forEach(function (button) { button.addEventListener('click', function () { var form = document.getElementById(button.dataset.clear); form.reset(); form.elements.id.value = ''; }); });
  document.getElementById('loginForm').addEventListener('submit', function (event) { event.preventDefault(); loginStatus.textContent = 'Signing in…'; call('/api/admin-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('adminEmail').value, password: document.getElementById('adminPassword').value }) }).then(start).catch(function (error) { loginStatus.textContent = error.message; loginStatus.className = 'form-status error'; }); });
  document.getElementById('refreshButton').addEventListener('click', function () { loadRequests().catch(function () {}); });
  document.getElementById('logoutButton').addEventListener('click', function (event) {
    var button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Logging out…';
    call('/api/admin-logout', { method: 'POST' }).then(function () { window.location.href = '/admin.html'; }).catch(function (error) { button.disabled = false; button.textContent = 'Log Out'; setStatus(error.message || 'Logout failed. Please try again.', true); });
  });

  loadRequests().then(function () {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }).catch(function (error) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    if (error.status === 401) {
      adminStatus.textContent = '';
      adminStatus.className = 'form-status';
    }
  });
});
