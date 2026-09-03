document.addEventListener('DOMContentLoaded', function () {
  var list = document.getElementById('requestList');
  var modal = document.createElement('div');
  modal.className = 'request-details-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = '<div class="request-details-panel"><button class="details-close" type="button" aria-label="Close request details">&times;</button><span class="eyebrow">Request details</span><h2>Submitted request</h2><div class="details-content"></div></div>';
  document.body.appendChild(modal);

  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]; }); }
  function label(value) { return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, function (character) { return character.toUpperCase(); }); }
  function field(name, value) { return '<div class="detail-field"><dt>' + escapeHtml(label(name)) + '</dt><dd>' + escapeHtml(value || 'Not provided').replace(/\n/g, '<br>') + '</dd></div>'; }
  function show(request) {
    var details = request.request_details || {};
    var detailHtml = Object.keys(details).map(function (key) { return field(key, details[key]); }).join('');
    modal.querySelector('.details-content').innerHTML = '<div class="details-actions"><button class="btn btn-secondary copy-request" type="button"><i class="fas fa-copy"></i> Copy Tracking Number</button><span class="copy-status form-status"></span></div><h3>Request Information</h3><dl class="details-grid">' + field('Request ID', request.request_id) + field('Service', request.service_type) + field('Status', request.status.replace(/_/g, ' ')) + field('Submission Date', new Date(request.created_at).toLocaleString()) + field('Last Updated', new Date(request.updated_at).toLocaleString()) + '</dl><h3>Customer Information</h3><dl class="details-grid">' + field('Full Name', request.customer_name) + field('Phone Number', request.phone) + field('Email Address', request.email) + field('Location', request.location) + '</dl><h3>All Submitted Information</h3><dl class="details-grid">' + (detailHtml || field('Request details', 'Not provided')) + '</dl><h3>Private Admin Notes</h3><p class="details-private">' + escapeHtml(request.admin_notes || 'No admin notes added.') + '</p>';
    modal.hidden = false;
    modal.querySelector('.copy-request').addEventListener('click', function () { navigator.clipboard.writeText(request.request_id).then(function () { modal.querySelector('.copy-status').textContent = 'Copied.'; }).catch(function () { modal.querySelector('.copy-status').textContent = 'Copy unavailable.'; }); });
  }
  function addButtons() {
    list.querySelectorAll('.admin-request').forEach(function (item) {
      if (item.querySelector('.details-button')) return;
      var save = item.querySelector('[data-save]');
      if (!save) return;
      var button = document.createElement('button');
      button.className = 'btn btn-secondary details-button'; button.type = 'button'; button.textContent = 'Open details'; button.dataset.requestId = save.dataset.save;
      item.appendChild(button);
    });
  }
  function loadDetails(requestId) {
    fetch('/api/admin-requests', { credentials: 'same-origin' }).then(function (response) { return response.json().then(function (data) { if (!response.ok) throw new Error(data.error || 'Could not load request details.'); return data.requests.filter(function (request) { return request.request_id === requestId; })[0]; }); }).then(function (request) { if (!request) throw new Error('Request not found.'); show(request); }).catch(function (error) { modal.querySelector('.details-content').innerHTML = '<p class="form-status error">' + escapeHtml(error.message) + '</p>'; modal.hidden = false; });
  }
  new MutationObserver(addButtons).observe(list, { childList: true });
  addButtons();
  list.addEventListener('click', function (event) { var button = event.target.closest('.details-button'); if (button) loadDetails(button.dataset.requestId); });
  modal.querySelector('.details-close').addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (event) { if (event.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') modal.hidden = true; });
});
