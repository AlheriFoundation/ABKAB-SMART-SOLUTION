document.addEventListener('DOMContentLoaded', function () {
  var WHATSAPP_URL = 'https://wa.me/2349061222869';
  var FORM_ENDPOINT = 'https://formsubmit.co/abdulwasiukura@gmail.com';
  var SITE_URL = 'https://www.abkabsmartsolution.site/';
  var params = new URLSearchParams(window.location.search);

  function sendEvent(name, data) {
    if (typeof gtag === 'function') gtag('event', name, data || {});
  }

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function validPhone(phone) {
    return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').length >= 7;
  }

  function setError(el, message) {
    if (!el) return;
    var wrap = el.closest('.field') || el.closest('.upload-card');
    var err = document.getElementById(el.id + 'Error');
    if (wrap) wrap.classList.toggle('is-invalid', !!message);
    if (err) err.textContent = message || '';
    el.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) el.setAttribute('aria-describedby', err.id);
  }

  function validateFile(input, required) {
    var file = input.files && input.files[0];
    var allowed = (input.accept || '').toLowerCase();
    var max = parseInt(input.dataset.maxSize || '5242880', 10);
    var meta = document.getElementById(input.id + 'Meta');
    var previewId = input.dataset.preview;
    var preview = previewId && document.getElementById(previewId);

    if (preview) {
      preview.hidden = true;
      preview.removeAttribute('src');
    }

    if (!file) {
      if (meta) meta.textContent = input.dataset.emptyText || 'No file selected.';
      setError(input, required ? 'Please upload this required document.' : '');
      return !required;
    }

    if (file.size < 1) {
      setError(input, 'This file appears to be empty.');
      return false;
    }

    if (file.size > max) {
      setError(input, 'Please upload a file not larger than 5 MB.');
      return false;
    }

    var ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    var type = (file.type || '').toLowerCase();
    if (allowed.indexOf(ext) === -1 && allowed.indexOf(type) === -1) {
      setError(input, 'Please choose JPG, JPEG, PNG or PDF only.');
      return false;
    }

    if (meta) meta.textContent = file.name + ' - ' + Math.round(file.size / 1024) + ' KB';
    if (preview && type.indexOf('image/') === 0) {
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    }
    setError(input, '');
    return true;
  }

  document.querySelectorAll('.faq-list details').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      document.querySelectorAll('.faq-list details[open]').forEach(function (other) {
        if (other !== item) other.removeAttribute('open');
      });
      var answer = item.querySelector('p');
      if (answer && answer.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        answer.animate([{ opacity: 0, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
      }
    });
  });

  var header = document.querySelector('.site-header');
  function headerState() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  headerState();
  window.addEventListener('scroll', headerState, { passive: true });

  document.querySelectorAll('.nav-toggle').forEach(function (button) {
    var nav = document.getElementById(button.getAttribute('aria-controls'));
    if (!nav) return;
    button.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
      button.querySelector('i').className = open ? 'fas fa-times' : 'fas fa-bars';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        button.querySelector('i').className = 'fas fa-bars';
      });
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      document.querySelectorAll('.main-nav.open').forEach(function (nav) {
        nav.classList.remove('open');
        var button = document.querySelector('[aria-controls="' + nav.id + '"]');
        if (button) {
          button.setAttribute('aria-expanded', 'false');
          button.querySelector('i').className = 'fas fa-bars';
          button.focus();
        }
      });
    }
  });

  var contactForm = document.getElementById('contactForm');
  var contactStatus = document.getElementById('formStatus');
  if (params.get('sent') === '1' && contactStatus) {
    contactStatus.textContent = 'Thank you - your request has been sent. We will review it and respond as soon as possible.';
    contactStatus.className = 'form-status success';
    history.replaceState({}, '', window.location.pathname);
  }
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      if (!contactForm.checkValidity()) {
        event.preventDefault();
        contactStatus.textContent = 'Please complete the required fields before sending your request.';
        contactStatus.className = 'form-status error';
        contactForm.reportValidity();
        return;
      }
      var button = contactForm.querySelector('[type="submit"]');
      if (contactForm.dataset.submitting === 'true') {
        event.preventDefault();
        return;
      }
      contactForm.dataset.submitting = 'true';
      if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
      }
      contactStatus.textContent = 'Sending your request securely...';
      contactStatus.className = 'form-status';
    });
  }

  var cacForm = document.getElementById('cacForm');
  var cacStatus = document.getElementById('cacStatus');
  var cacSuccess = document.getElementById('cacSuccess');
  var cacWhatsappLink = document.getElementById('cacWhatsappLink');
  var cacStarted = false;
  var uploadStarted = false;

  if (cacForm) {
    cacForm.querySelectorAll('input,select,textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        if (!cacStarted) {
          cacStarted = true;
          sendEvent('cac_form_started');
        }
        if (el.type !== 'file') setError(el, '');
      });
    });
    cacForm.querySelectorAll('input[type="file"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!uploadStarted) {
          uploadStarted = true;
          sendEvent('cac_document_upload_started');
        }
        validateFile(input, input.required);
      });
    });
    cacForm.addEventListener('submit', function (event) {
      var ok = true;
      [
        ['cacName', 'Please enter your full name.'],
        ['cacPhone', 'Please enter a valid phone number.'],
        ['cacEmail', 'Please enter a valid email address.'],
        ['residentialAddress', 'Please enter your residential address.'],
        ['cacType', 'Please select BN - Business Name Registration.'],
        ['nameOne', 'Please enter the first proposed business name.'],
        ['nameTwo', 'Please enter the second proposed business name.'],
        ['nameThree', 'Please enter the third proposed business name.'],
        ['nature', 'Please describe the nature of business.'],
        ['businessAddress', 'Please enter the business address.'],
        ['businessState', 'Please select the business state.'],
        ['businessLga', 'Please enter the business LGA.'],
        ['ninNumber', 'Please enter your 11-digit NIN number.'],
        ['dateOfBirth', 'Please enter your date of birth.'],
        ['gender', 'Please select your gender.']
      ].forEach(function (item) {
        var el = document.getElementById(item[0]);
        if (!el) return;
        var bad = !el.value.trim() || (el.id === 'cacPhone' && !validPhone(el.value)) || (el.id === 'ninNumber' && !/^\d{11}$/.test(el.value.trim())) || (el.type === 'email' && !el.validity.valid);
        setError(el, bad ? item[1] : '');
        if (bad) ok = false;
      });
      ['passport', 'ninDocument', 'signature'].forEach(function (id) {
        var input = document.getElementById(id);
        if (input && !validateFile(input, true)) ok = false;
      });
      if (!ok) {
        event.preventDefault();
        cacStatus.textContent = 'Please correct the highlighted fields before submitting.';
        cacStatus.className = 'form-status error';
        var first = cacForm.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }
      var message = [
        'CAC Business Name Registration Request',
        'Name: ' + value('cacName'),
        'Phone: ' + value('cacPhone'),
        'Email: ' + value('cacEmail'),
        'CAC Service: BN - Business Name Registration',
        'Residential Address: ' + value('residentialAddress'),
        'Proposed Name 1: ' + value('nameOne'),
        'Proposed Name 2: ' + value('nameTwo'),
        'Proposed Name 3: ' + value('nameThree'),
        'Nature of Business: ' + value('nature'),
        'Business State: ' + value('businessState'),
        'Business LGA: ' + value('businessLga'),
        'NIN Number: [submitted as a private document field]',
        'Date of Birth: ' + value('dateOfBirth'),
        'Gender: ' + value('gender'),
        'Additional Notes: ' + (value('notes') || 'None'),
        'I have submitted my CAC registration request through the ABKAB Smart Solution website.'
      ].join('\n');
      if (cacWhatsappLink) {
        cacWhatsappLink.href = WHATSAPP_URL + '?text=' + encodeURIComponent(message);
        sessionStorage.setItem('abkabCacWhatsApp', cacWhatsappLink.href);
      }
      sendEvent('cac_form_submitted');
      if (cacSuccess) {
        sessionStorage.setItem('abkabCacSubmitted', '1');
      }
    });
    if (sessionStorage.getItem('abkabCacSubmitted') === '1' && cacSuccess) {
      cacSuccess.hidden = false;
      if (cacWhatsappLink && sessionStorage.getItem('abkabCacWhatsApp')) cacWhatsappLink.href = sessionStorage.getItem('abkabCacWhatsApp');
      sessionStorage.removeItem('abkabCacSubmitted');
      sessionStorage.removeItem('abkabCacWhatsApp');
      cacSuccess.scrollIntoView({ block: 'start' });
    }
    if (cacWhatsappLink) cacWhatsappLink.addEventListener('click', function () { sendEvent('cac_whatsapp_clicked'); });
  }

  document.querySelectorAll('[data-service-select]').forEach(function (link) {
    link.addEventListener('click', function () {
      sendEvent('service_request_selected', { service: link.dataset.serviceSelect || 'unknown' });
    });
  });

  var requestForm = document.getElementById('serviceRequestForm');
  var serviceFields = document.getElementById('serviceFields');
  var requestTitle = document.getElementById('requestTitle');
  var requestIntro = document.getElementById('requestIntro');
  var formTitle = document.getElementById('formTitle');
  var requestSubmit = document.getElementById('requestSubmit');
  var requestStatus = document.getElementById('requestStatus');
  var requestSuccess = document.getElementById('requestSuccess');
  var requestWhatsappLink = document.getElementById('requestWhatsappLink');
  var requestReferenceNote = document.getElementById('requestReferenceNote');
  var requestStarted = false;

  var serviceConfigs = {
    website: {
      title: 'Website Development Request',
      serviceName: 'Website Development',
      subject: 'New Website Development Request - ABKAB Smart Solution',
      cta: 'Submit Website Request',
      intro: 'Tell us the kind of website you need, the pages, features and project goals.',
      whatsapp: ['websiteType', 'pageCount', 'websiteFeatures', 'domainStatus', 'hostingStatus', 'websiteDescription'],
      fields: [
        { type: 'select', id: 'websiteType', name: 'Website Type', label: 'Website Type', required: true, options: ['Business Website', 'Company Website', 'Portfolio', 'E-commerce', 'School', 'NGO/Organization', 'Blog/News', 'Custom', 'Not Sure'] },
        { type: 'select', id: 'pageCount', name: 'Number of Pages', label: 'Number of Pages', required: true, options: ['1-3', '4-6', '7-10', '10+', 'Not Sure'] },
        { type: 'checkboxes', id: 'websiteFeatures', name: 'Features', label: 'Features', options: ['Contact Form', 'WhatsApp', 'Online Payment', 'Admin Dashboard', 'Blog', 'Booking', 'Customer Portal', 'Database', 'SEO', 'Google Analytics', 'Other'] },
        { type: 'select', id: 'domainStatus', name: 'Existing Domain', label: 'Existing Domain', required: true, options: ['Yes', 'No', 'Not Sure'] },
        { type: 'select', id: 'hostingStatus', name: 'Existing Hosting', label: 'Existing Hosting', required: true, options: ['Yes', 'No', 'Not Sure'] },
        { type: 'textarea', id: 'websiteDescription', name: 'Project Description', label: 'Project Description', required: true }
      ]
    },
    software: {
      title: 'Software & Digital Solutions Request',
      serviceName: 'Software & Digital Solutions',
      subject: 'New Software Request - ABKAB Smart Solution',
      cta: 'Submit Software Request',
      intro: 'Share the software type, platform and core features your workflow needs.',
      whatsapp: ['softwareType', 'platform', 'requiredFeatures', 'existingSystem', 'softwareDescription'],
      fields: [
        { type: 'select', id: 'softwareType', name: 'Software Type', label: 'Software Type', required: true, options: ['Business Management', 'School Management', 'POS', 'Inventory', 'Accounting', 'Booking', 'CRM', 'Web Application', 'Mobile Application', 'Custom Software', 'Not Sure'] },
        { type: 'select', id: 'platform', name: 'Platform', label: 'Platform', required: true, options: ['Web', 'Windows', 'Android', 'iOS', 'Web + Mobile', 'Not Sure'] },
        { type: 'textarea', id: 'requiredFeatures', name: 'Required Features', label: 'Required Features' },
        { type: 'select', id: 'existingSystem', name: 'Existing System', label: 'Existing System', required: true, options: ['Yes', 'No'] },
        { type: 'textarea', id: 'softwareDescription', name: 'Project Description', label: 'Project Description', required: true }
      ]
    },
    networking: {
      title: 'Networking & Cloud Computing Request',
      serviceName: 'Networking & Cloud Computing',
      subject: 'New Networking Request - ABKAB Smart Solution',
      cta: 'Submit Networking Request',
      intro: 'Describe the network or cloud service needed and the current issue.',
      whatsapp: ['networkService', 'environment', 'networkProblem', 'serviceDate'],
      fields: [
        { type: 'select', id: 'networkService', name: 'Service', label: 'Service', required: true, options: ['Network Installation', 'Wi-Fi Setup', 'Router Configuration', 'Office Networking', 'CCTV Networking', 'Server Setup', 'Cloud Setup', 'Cloud Migration', 'Network Troubleshooting', 'Network Security', 'Other'] },
        { type: 'select', id: 'environment', name: 'Environment', label: 'Environment', required: true, options: ['Home', 'Business', 'Office', 'School', 'Organization', 'Other'] },
        { type: 'textarea', id: 'networkProblem', name: 'Current Problem', label: 'Current Problem', required: true },
        { type: 'input', id: 'serviceDate', name: 'Preferred Service Date', label: 'Preferred Service Date', inputType: 'date' }
      ]
    },
    'graphic-design': {
      title: 'Graphic Design Request',
      serviceName: 'Graphic Design & Branding',
      subject: 'New Graphic Design Request - ABKAB Smart Solution',
      cta: 'Submit Design Request',
      intro: 'Send design details, preferred style and an optional private reference file.',
      whatsapp: ['designService', 'designQuantity', 'designSize', 'designStyle', 'designDetails'],
      fields: [
        { type: 'select', id: 'designService', name: 'Design', label: 'Design', required: true, options: ['Logo', 'Flyer', 'Poster', 'Banner', 'Business Card', 'Social Media Design', 'Brand Identity', 'Invitation', 'Certificate', 'Letterhead', 'Other'] },
        { type: 'input', id: 'designQuantity', name: 'Quantity', label: 'Quantity', inputType: 'text' },
        { type: 'input', id: 'designSize', name: 'Size', label: 'Size', inputType: 'text' },
        { type: 'input', id: 'designStyle', name: 'Preferred Style/Color', label: 'Preferred Style/Color', inputType: 'text' },
        { type: 'textarea', id: 'designDetails', name: 'Design Details', label: 'Design Details', required: true },
        { type: 'file', id: 'designReference', name: 'attachment', label: 'Reference File', accept: '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf' }
      ]
    },
    printing: {
      title: 'Printing Services Request',
      serviceName: 'Printing Services',
      subject: 'New Printing Request - ABKAB Smart Solution',
      cta: 'Submit Printing Request',
      intro: 'Place a printing order with quantity, material, delivery and optional design upload.',
      whatsapp: ['printingType', 'printQuantity', 'printSize', 'printColor', 'paperMaterial', 'deliveryMethod', 'printingInstructions'],
      fields: [
        { type: 'select', id: 'printingType', name: 'Printing Type', label: 'Printing Type', required: true, options: ['Flyer', 'Poster', 'Banner', 'Business Card', 'Invitation', 'Certificate', 'Letterhead', 'Brochure', 'Sticker', 'Document Printing', 'Other'] },
        { type: 'input', id: 'printQuantity', name: 'Quantity', label: 'Quantity', inputType: 'text', required: true },
        { type: 'input', id: 'printSize', name: 'Size', label: 'Size', inputType: 'text' },
        { type: 'select', id: 'printColor', name: 'Color', label: 'Color', required: true, options: ['Full Color', 'Black & White', 'Not Sure'] },
        { type: 'input', id: 'paperMaterial', name: 'Material/Paper', label: 'Material/Paper', inputType: 'text' },
        { type: 'select', id: 'deliveryMethod', name: 'Delivery', label: 'Delivery', required: true, options: ['Pickup', 'Delivery', 'Not Sure'] },
        { type: 'file', id: 'printFile', name: 'attachment', label: 'Design/File Upload', accept: '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf' },
        { type: 'textarea', id: 'printingInstructions', name: 'Printing Instructions', label: 'Printing Instructions', required: true }
      ]
    },
    computer: {
      title: 'Computer Service Request',
      serviceName: 'Computer Services',
      subject: 'New Computer Service Request - ABKAB Smart Solution',
      cta: 'Submit Computer Service Request',
      intro: 'Tell us the device, problem and preferred support method.',
      whatsapp: ['computerService', 'deviceType', 'problemDescription', 'serviceMethod'],
      fields: [
        { type: 'select', id: 'computerService', name: 'Service', label: 'Service', required: true, options: ['Windows Installation', 'Software Installation', 'Formatting', 'Virus/Malware Removal', 'Troubleshooting', 'Laptop/Desktop Setup', 'Driver Installation', 'System Optimization', 'Data Backup', 'Other'] },
        { type: 'select', id: 'deviceType', name: 'Device', label: 'Device', required: true, options: ['Laptop', 'Desktop', 'Other'] },
        { type: 'textarea', id: 'problemDescription', name: 'Problem Description', label: 'Problem Description', required: true },
        { type: 'select', id: 'serviceMethod', name: 'Service Method', label: 'Service Method', required: true, options: ['In Person', 'Remote', 'Not Sure'] }
      ]
    },
    'digital-support': {
      title: 'Digital Business Support Request',
      serviceName: 'Digital Business Support',
      subject: 'New Digital Business Support Request - ABKAB Smart Solution',
      cta: 'Submit Support Request',
      intro: 'Describe the digital business support or online task you need help with.',
      whatsapp: ['digitalService', 'supportDetails'],
      fields: [
        { type: 'select', id: 'digitalService', name: 'Service', label: 'Service', required: true, options: ['Business Setup', 'Digital Registration Support', 'Online Application Support', 'Data Entry', 'Document Preparation', 'Business Digitalization', 'Social Media Support', 'General Digital Support', 'Other'] },
        { type: 'textarea', id: 'supportDetails', name: 'Describe What You Need', label: 'Describe What You Need', required: true }
      ]
    }
  };

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderField(field) {
    var required = field.required ? ' <span class="required">*</span>' : '';
    var html = '<div class="field ' + (field.type === 'textarea' || field.type === 'checkboxes' || field.type === 'file' ? 'full' : '') + '">';
    html += '<label for="' + field.id + '">' + esc(field.label) + required + '</label>';
    if (field.type === 'select') {
      html += '<select id="' + field.id + '" name="' + esc(field.name) + '" ' + (field.required ? 'required' : '') + '><option value="" selected disabled>Select option</option>' + field.options.map(function (option) { return '<option>' + esc(option) + '</option>'; }).join('') + '</select>';
    } else if (field.type === 'textarea') {
      html += '<textarea id="' + field.id + '" name="' + esc(field.name) + '" ' + (field.required ? 'required' : '') + '></textarea>';
    } else if (field.type === 'checkboxes') {
      html += '<div class="checkbox-grid" id="' + field.id + '">' + field.options.map(function (option, index) {
        var itemId = field.id + '_' + index;
        return '<label class="check-option" for="' + itemId + '"><input id="' + itemId + '" type="checkbox" name="' + esc(field.name) + '" value="' + esc(option) + '"> <span>' + esc(option) + '</span></label>';
      }).join('') + '</div>';
    } else if (field.type === 'file') {
      html += '<input id="' + field.id + '" name="' + esc(field.name) + '" type="file" accept="' + esc(field.accept) + '" data-max-size="5242880" data-empty-text="JPG, JPEG, PNG or PDF. Maximum 5 MB."><div class="file-meta" id="' + field.id + 'Meta">JPG, JPEG, PNG or PDF. Maximum 5 MB.</div>';
    } else {
      html += '<input id="' + field.id + '" name="' + esc(field.name) + '" type="' + esc(field.inputType || 'text') + '" ' + (field.min ? 'min="' + esc(field.min) + '"' : '') + ' ' + (field.required ? 'required' : '') + '>';
    }
    html += '<span class="field-error" id="' + field.id + 'Error"></span></div>';
    return html;
  }

  function generateReference() {
    var d = new Date();
    var date = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return 'ABKAB-REQ-' + date + '-' + Math.floor(1000 + Math.random() * 9000);
  }

  function selectedCheckboxes(id) {
    return Array.prototype.slice.call(document.querySelectorAll('#' + id + ' input:checked')).map(function (input) {
      return input.value;
    }).join(', ');
  }

  function requestValue(id) {
    var el = document.getElementById(id);
    if (!el || el.type === 'file') return '';
    return el.value.trim();
  }

  function setupRequestForm() {
    if (!requestForm || !serviceFields) return;
    var requestedKey = params.get('service') || 'website';
    var key = Object.prototype.hasOwnProperty.call(serviceConfigs, requestedKey) ? requestedKey : 'website';
    var config = serviceConfigs[key];
    var reference = params.get('ref') || sessionStorage.getItem('abkabRequestReference') || '';

    requestForm.action = FORM_ENDPOINT;
    requestTitle.textContent = config.title;
    requestIntro.textContent = config.intro;
    formTitle.textContent = config.title;
    requestSubmit.innerHTML = esc(config.cta) + ' <i class="fas fa-arrow-right"></i>';
    serviceFields.innerHTML = config.fields.map(renderField).join('');
    document.getElementById('serviceNameField').value = config.serviceName;
    document.getElementById('serviceKeyField').value = key;
    document.getElementById('requestSubject').value = config.subject;
    document.getElementById('requestAutoresponse').value = 'Thank you for choosing ABKAB Smart Solution.\n\nWe have received your ' + config.serviceName + ' request. Our team will review it and contact you using your preferred contact method.\n\nABKAB Smart Solution\n' + SITE_URL;

    sendEvent('service_request_viewed', { service: key });

    requestForm.querySelectorAll('input,select,textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        if (!requestStarted) {
          requestStarted = true;
          sendEvent('service_request_form_started', { service: key });
        }
        if (el.type !== 'file') setError(el, '');
      });
    });
    requestForm.querySelectorAll('input[type="file"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!requestStarted) {
          requestStarted = true;
          sendEvent('service_request_form_started', { service: key });
        }
        validateFile(input, input.required);
      });
    });

    if (params.get('sent') === '1' && requestSuccess) {
      var requestSection = requestForm.closest('.section');
      requestSuccess.hidden = false;
      if (requestSection) requestSection.hidden = true;
      if (reference && requestReferenceNote) requestReferenceNote.textContent = 'Client-generated reference: ' + reference;
      if (requestWhatsappLink && sessionStorage.getItem('abkabRequestWhatsApp')) requestWhatsappLink.href = sessionStorage.getItem('abkabRequestWhatsApp');
      sessionStorage.removeItem('abkabRequestWhatsApp');
      sessionStorage.removeItem('abkabRequestReference');
      requestSuccess.scrollIntoView({ block: 'start' });
    }

    requestForm.addEventListener('submit', function (event) {
      var ok = true;
      [
        ['requestName', 'Please enter your full name.'],
        ['requestPhone', 'Please enter a valid phone number.'],
        ['requestEmail', 'Please enter a valid email address.'],
        ['contactMethod', 'Please choose a contact method.']
      ].concat(config.fields.filter(function (field) { return field.required; }).map(function (field) {
        return [field.id, 'Please complete this required field.'];
      })).forEach(function (item) {
        var el = document.getElementById(item[0]);
        if (!el) return;
        var bad = !el.value.trim() || (el.id === 'requestPhone' && !validPhone(el.value)) || (el.type === 'email' && !el.validity.valid);
        setError(el, bad ? item[1] : '');
        if (bad) ok = false;
      });

      requestForm.querySelectorAll('input[type="file"]').forEach(function (input) {
        if (!validateFile(input, input.required)) ok = false;
      });

      if (!ok) {
        event.preventDefault();
        requestStatus.textContent = 'Please correct the highlighted fields before submitting.';
        requestStatus.className = 'form-status error';
        var first = requestForm.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }

      if (requestForm.dataset.submitting === 'true') {
        event.preventDefault();
        return;
      }

      var ref = generateReference();
      document.getElementById('requestReferenceField').value = ref;
      document.getElementById('requestNext').value = SITE_URL + 'request.html?sent=1&service=' + encodeURIComponent(key) + '&ref=' + encodeURIComponent(ref);

      var lines = [
        'ABKAB SMART SOLUTION',
        'Service Request',
        '',
        'Service: ' + config.serviceName,
        'Reference: ' + ref,
        '',
        'Name: ' + requestValue('requestName'),
        'Phone: ' + requestValue('requestPhone'),
        'Email: ' + requestValue('requestEmail'),
        'Preferred Contact: ' + requestValue('contactMethod')
      ];
      if (requestValue('requestLocation')) lines.push('Location: ' + requestValue('requestLocation'));
      config.whatsapp.forEach(function (id) {
        var field = config.fields.filter(function (item) { return item.id === id; })[0];
        var val = field && field.type === 'checkboxes' ? selectedCheckboxes(id) : requestValue(id);
        if (field && val) lines.push(field.label + ': ' + val);
      });
      if (requestValue('requestNotes')) lines.push('Additional Notes: ' + requestValue('requestNotes'));
      lines.push('', 'I have submitted this service request through the ABKAB Smart Solution website.');

      if (requestWhatsappLink) {
        requestWhatsappLink.href = WHATSAPP_URL + '?text=' + encodeURIComponent(lines.join('\n'));
        sessionStorage.setItem('abkabRequestWhatsApp', requestWhatsappLink.href);
      }
      sessionStorage.setItem('abkabRequestReference', ref);
      requestForm.dataset.submitting = 'true';
      requestSubmit.disabled = true;
      requestSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';
      requestStatus.textContent = 'Submitting your request securely...';
      requestStatus.className = 'form-status';
      sendEvent('service_request_submitted', { service: key });
    });

    if (requestWhatsappLink) requestWhatsappLink.addEventListener('click', function () {
      sendEvent('service_request_whatsapp_clicked', { service: key });
    });
  }
  setupRequestForm();

  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      var category = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      document.querySelectorAll('.project-card[data-category]').forEach(function (card) {
        card.hidden = category !== 'all' && card.dataset.category !== category;
      });
    });
  });

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.service-card,.service-detail,.project-card,.reason,.process-step,.testimonial-empty').forEach(function (item) {
      item.classList.add('reveal');
      observer.observe(item);
    });
  }
});
