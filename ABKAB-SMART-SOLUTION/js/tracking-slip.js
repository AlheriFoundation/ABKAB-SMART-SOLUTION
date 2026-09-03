window.ABKABTrackingSlip = (function () {
  var STATUS_LABELS = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    PROCESSING: 'Processing',
    APPROVED: 'Approved',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    NEW: 'Pending',
    IN_PROGRESS: 'Processing',
    WAITING_FOR_CUSTOMER: 'Under Review'
  };

  var STATUS_COLORS = {
    PENDING: '#f59e0b',
    UNDER_REVIEW: '#1463d9',
    PROCESSING: '#0c2a76',
    APPROVED: '#0f766e',
    COMPLETED: '#157d48',
    REJECTED: '#b42318',
    CANCELLED: '#6b7280'
  };

  function normalizeStatus(value) {
    var status = String(value || '').trim().toUpperCase();
    if (!status || status === 'NEW') return 'PENDING';
    if (status === 'IN_PROGRESS') return 'PROCESSING';
    if (status === 'WAITING_FOR_CUSTOMER') return 'UNDER_REVIEW';
    return status;
  }

  function labelStatus(value) {
    var status = normalizeStatus(value);
    return STATUS_LABELS[status] || status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function (character) {
      return character.toUpperCase();
    });
  }

  function dateText(value, options) {
    if (!value) return 'Not provided';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Not provided';
    return date.toLocaleString(undefined, options || { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function dayText(value) {
    if (!value) return 'Not provided';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Not provided';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fieldValue(request, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (request && request[key] != null && String(request[key]).trim()) return String(request[key]).trim();
    }
    return 'Not provided';
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    var words = String(text || '').split(/\s+/);
    var line = '';
    var lines = 0;
    for (var i = 0; i < words.length; i += 1) {
      var word = words[i];
      var testLine = line ? line + ' ' + word : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        context.fillText(line, x, y);
        y += lineHeight;
        lines += 1;
        if (maxLines && lines >= maxLines - 1) {
          context.fillText(words.slice(i).join(' '), x, y);
          return y;
        }
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) context.fillText(line, x, y);
    return y;
  }

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function normalizeRequest(request) {
    return {
      trackingNumber: fieldValue(request, ['trackingNumber', 'request_id']),
      customerName: fieldValue(request, ['customerName', 'customer_name']),
      serviceRequested: fieldValue(request, ['serviceRequested', 'service_type']),
      serviceCategory: fieldValue(request, ['serviceCategory', 'service_category', 'service_type']),
      status: normalizeStatus(fieldValue(request, ['status'])),
      createdAt: fieldValue(request, ['createdAt', 'created_at']),
      updatedAt: fieldValue(request, ['updatedAt', 'updated_at']),
      customerNote: fieldValue(request, ['customerNote', 'customer_note'])
    };
  }

  function drawSlip(context, request) {
    var data = normalizeRequest(request);
    var width = context.canvas.width;
    var height = context.canvas.height;
    var statusColor = STATUS_COLORS[data.status] || '#1463d9';

    var gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fbff');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#f4f7fc');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#0c2a76';
    context.fillRect(0, 0, width, 240);
    context.fillStyle = '#e31a1a';
    context.fillRect(0, 240, width, 16);

    context.globalAlpha = 0.08;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3;
    for (var i = -120; i < width + 120; i += 88) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i + 240, height);
      context.stroke();
    }
    context.globalAlpha = 1;

    context.fillStyle = '#ffffff';
    context.font = '800 34px Manrope, Arial, sans-serif';
    context.fillText('ABKAB SMART SOLUTION', 96, 78);
    context.font = '600 20px Inter, Arial, sans-serif';
    context.fillText('Customer Request Tracking', 98, 118);
    context.font = '800 58px Manrope, Arial, sans-serif';
    context.fillText(data.trackingNumber || 'Tracking Number', 96, 188);

    context.fillStyle = '#eef4ff';
    roundedRect(context, 940, 66, 560, 106, 26);
    context.fill();
    context.fillStyle = '#0c2a76';
    context.font = '800 19px Inter, Arial, sans-serif';
    context.fillText('REQUEST STATUS', 974, 104);
    context.fillStyle = statusColor;
    context.font = '800 38px Manrope, Arial, sans-serif';
    context.fillText(labelStatus(data.status), 974, 148);

    context.fillStyle = '#ffffff';
    roundedRect(context, 72, 332, 1456, 1280, 34);
    context.shadowColor = 'rgba(12, 42, 118, 0.09)';
    context.shadowBlur = 32;
    context.shadowOffsetY = 18;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    context.fillStyle = '#14213d';
    context.font = '800 26px Manrope, Arial, sans-serif';
    context.fillText('Tracking Overview', 112, 392);
    context.strokeStyle = '#dfe6f1';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(112, 416);
    context.lineTo(1490, 416);
    context.stroke();

    var labels = [
      ['Tracking Number', data.trackingNumber],
      ['Customer Name', data.customerName],
      ['Service Requested', data.serviceRequested],
      ['Service Category', data.serviceCategory],
      ['Current Status', labelStatus(data.status)],
      ['Date Submitted', dayText(data.createdAt)],
      ['Last Updated', dateText(data.updatedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })]
    ];

    var leftX = 112;
    var rightX = 820;
    var topY = 470;
    var rowGap = 132;

    labels.forEach(function (item, index) {
      var colX = index % 2 === 0 ? leftX : rightX;
      var rowY = topY + Math.floor(index / 2) * rowGap;
      context.fillStyle = '#526078';
      context.font = '700 18px Inter, Arial, sans-serif';
      context.fillText(item[0].toUpperCase(), colX, rowY);
      context.fillStyle = item[0] === 'Current Status' ? statusColor : '#14213d';
      context.font = item[0] === 'Current Status' ? '800 32px Manrope, Arial, sans-serif' : '700 31px Manrope, Arial, sans-serif';
      wrapText(context, item[1], colX, rowY + 46, 540, 42, 2);
    });

    context.fillStyle = '#eaf0fb';
    roundedRect(context, 112, 1120, 1378, 230, 28);
    context.fill();
    context.fillStyle = '#0c2a76';
    context.font = '800 22px Manrope, Arial, sans-serif';
    context.fillText('Customer Note', 146, 1166);
    context.fillStyle = '#14213d';
    context.font = '500 24px Inter, Arial, sans-serif';
    wrapText(context, data.customerNote || 'No customer-facing note has been added yet.', 146, 1214, 1308, 36, 4);

    context.fillStyle = '#526078';
    context.font = '600 18px Inter, Arial, sans-serif';
    context.fillText('Keep this slip safe. You can share it on WhatsApp or use the tracking number above anytime.', 112, 1488);

    context.fillStyle = '#0c2a76';
    context.font = '800 20px Inter, Arial, sans-serif';
    context.fillText('www.abkabsmartsolution.site', 112, 1540);

    context.fillStyle = '#e31a1a';
    context.beginPath();
    context.arc(1460, 1508, 28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '900 20px Inter, Arial, sans-serif';
    context.fillText('AB', 1448, 1515);

    return data;
  }

  function renderToCanvas(request) {
    var canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1600;
    var context = canvas.getContext('2d');
    var data = drawSlip(context, request);
    return { canvas: canvas, context: context, data: data };
  }

  function toBlob(request) {
    return new Promise(function (resolve, reject) {
      var rendered = renderToCanvas(request);
      rendered.canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('Unable to generate the tracking slip.'));
        resolve({ blob: blob, data: rendered.data });
      }, 'image/png');
    });
  }

  function download(request, fileName) {
    return toBlob(request).then(function (result) {
      var link = document.createElement('a');
      link.href = URL.createObjectURL(result.blob);
      link.download = fileName || ((normalizeRequest(request).trackingNumber || 'abkab-tracking') + '-tracking-slip.png');
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
        link.remove();
      }, 1200);
      return result.data;
    });
  }

  return {
    normalizeStatus: normalizeStatus,
    labelStatus: labelStatus,
    dateText: dateText,
    dayText: dayText,
    normalizeRequest: normalizeRequest,
    renderToCanvas: renderToCanvas,
    toBlob: toBlob,
    download: download
  };
})();
