document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('trackingForm'); var status = document.getElementById('trackingStatus'); var result = document.getElementById('trackingResult');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!form.checkValidity()) { form.reportValidity(); return; }
    status.textContent = 'Checking securely...'; status.className = 'form-status'; result.hidden = true;
    fetch('/api/track-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: document.getElementById('trackingId').value, email: document.getElementById('trackingEmail').value }) }).then(function (response) { return response.json().then(function (data) { if (!response.ok) throw new Error(data.error); return data.request; }); }).then(function (request) {
      document.getElementById('resultId').textContent = request.request_id; document.getElementById('resultService').textContent = request.service_type; document.getElementById('resultStatus').textContent = request.status.replace(/_/g, ' '); document.getElementById('resultCreated').textContent = new Date(request.created_at).toLocaleString(); document.getElementById('resultUpdated').textContent = new Date(request.updated_at).toLocaleString(); result.hidden = false; status.textContent = '';
    }).catch(function (error) { status.textContent = error.message || 'Tracking is temporarily unavailable.'; status.className = 'form-status error'; });
  });
});