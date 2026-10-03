document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('trackingForm');
  var status = document.getElementById('trackingStatus');
  var result = document.getElementById('trackingResult');
  var followup = document.getElementById('trackingFollowup');
  var whatsappLink = document.getElementById('trackingWhatsappLink');
  var params = new URLSearchParams(window.location.search);
  var currentRequest;

  function track() {
    status.textContent = 'Checking securely...';
    status.className = 'form-status';
    result.hidden = true;
    if (window.location.protocol === 'file:') {
      status.textContent = 'Tracking needs the website server. Open the deployed website or run it through a local web server.';
      status.className = 'form-status error';
      return;
    }
    fetch('/api/track-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: document.getElementById('trackingId').value, email: document.getElementById('trackingEmail').value }) })
      .then(function (response) { return response.json().then(function (data) { if (!response.ok) throw new Error(data.error || 'Tracking is temporarily unavailable.'); return data.request; }); })
      .then(function (request) {
        currentRequest = request;
        if (window.ABKABAnalytics) window.ABKABAnalytics.track('tracking_viewed', { service: request.service_type });
        document.getElementById('resultId').textContent = request.request_id;
        document.getElementById('resultCustomer').textContent = request.customer_name;
        document.getElementById('resultService').textContent = request.service_type;
        document.getElementById('resultStatus').textContent = window.ABKABTrackingSlip.labelStatus(request.status);
        document.getElementById('resultCreated').textContent = window.ABKABTrackingSlip.dateText(request.created_at);
        document.getElementById('resultUpdated').textContent = window.ABKABTrackingSlip.dateText(request.updated_at);
        document.getElementById('resultNote').textContent = request.customer_note || 'No customer-facing update has been added.';
        if (followup) followup.hidden = false;
        if (whatsappLink) whatsappLink.href = 'https://wa.me/2349061222869?text=' + encodeURIComponent('Hello ABKAB, I am following up on request ' + request.request_id + ' for ' + request.service_type + '.');
        updateTimeline(request.status);
        result.hidden = false;
        status.textContent = '';
        addActions();
      })
      .catch(function (error) { console.error('Tracking request failed', error.message); status.textContent = error.message; status.className = 'form-status error'; });
  }
  function updateTimeline(value) {
    var normalized = window.ABKABTrackingSlip.normalizeStatus(value);
    var active = { PENDING: 0, UNDER_REVIEW: 1, PROCESSING: 2, APPROVED: 2, COMPLETED: 3, REJECTED: 2, CANCELLED: 2 }[normalized];
    document.querySelectorAll('.request-timeline [data-step]').forEach(function (step, index) { step.classList.toggle('is-active', index <= active); step.classList.toggle('is-current', index === active); });
  }
  function addActions() {
    if (document.getElementById('downloadTrackingResult')) return;
    var actions = document.createElement('div');
    actions.className = 'tracking-card-actions';
    actions.innerHTML = '<button id="downloadTrackingResult" class="btn btn-primary" type="button">Download Tracking Slip <i class="fas fa-download"></i></button><p id="cardStatus" class="form-status" role="status"></p>';
    result.appendChild(actions);
    document.getElementById('downloadTrackingResult').addEventListener('click', function () {
      window.ABKABTrackingSlip.download(currentRequest).then(function () { document.getElementById('cardStatus').textContent = 'Tracking slip downloaded.'; }).catch(function (error) { document.getElementById('cardStatus').textContent = error.message; });
    });
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); if (!form.checkValidity()) { form.reportValidity(); return; } track(); });
  var tracking = params.get('tracking');
  if (tracking) document.getElementById('trackingId').value = tracking;
});
