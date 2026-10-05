document.addEventListener('DOMContentLoaded', function () {
  var WHATSAPP_URL = 'https://wa.me/2349061222869';
  var FORM_ENDPOINT = 'https://formsubmit.co/abdulwasiukura@gmail.com';
  var SITE_URL = 'https://www.abkabsmartsolution.site/';
  var params = new URLSearchParams(window.location.search);
  var pageName = window.location.pathname.split('/').pop().replace(/\.html$/, '').toLowerCase() || 'home';
  var attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var attribution = {};
  try {
    attribution = JSON.parse(sessionStorage.getItem('abkabAttribution') || '{}');
  } catch (_) {}
  attributionKeys.forEach(function (key) {
    var value = params.get(key);
    if (value) attribution[key] = value.slice(0, 120);
  });
  try {
    if (Object.keys(attribution).length) sessionStorage.setItem('abkabAttribution', JSON.stringify(attribution));
  } catch (_) {}
  document.body.classList.add('page-' + pageName);

  document.querySelectorAll('.nav-cta').forEach(function (link) {
    link.href = 'request.html';
    if (!link.textContent.trim()) link.textContent = 'Start a Project';
  });
  document.querySelectorAll('.main-nav a').forEach(function (link) {
    if (link.textContent.trim().toLowerCase() === 'solutions') link.closest('li').remove();
  });
  var serviceLinkMap = { 'technology & software':'web-development', 'website development':'web-development', 'web development':'web-development', 'networking & it':'networking', 'cloud & digital technology':'cloud', 'cloud services':'cloud', 'branding, printing & documents':'branding', 'branding & printing':'branding', 'digital marketing':'marketing', 'cac registration':'cac' };
  document.querySelectorAll('.mini-service a, .service-card a').forEach(function (link) {
    var card = link.closest('.mini-service,.service-card');
    var title = card && card.querySelector('h3');
    var titleText = title && title.textContent.trim().toLowerCase();
    var key = serviceLinkMap[titleText];
    if (!key && titleText) key = /cloud/.test(titleText) ? 'cloud' : /network|computer|server|router|wifi|it support/.test(titleText) ? 'networking' : /brand|design|print|document|photo|binding|lamination/.test(titleText) ? 'branding' : /marketing|social|advert|digital/.test(titleText) ? 'marketing' : /cac|registration|identity/.test(titleText) ? 'cac' : 'web-development';
    if (key) link.href = 'service.html?service=' + encodeURIComponent(key);
  });
  document.querySelectorAll('.cta-band .btn-light').forEach(function (link) {
    link.href = 'request.html';
    link.textContent = 'Request a Service';
  });
  document.querySelectorAll('.mini-service .btn-secondary').forEach(function (link) {
    link.innerHTML = 'Request a Service <i class="fas fa-arrow-right"></i>';
  });

  document.querySelectorAll('img:not([loading])').forEach(function (image) {
    if (!image.closest('.brand, .footer-brand')) image.loading = 'lazy';
    image.decoding = 'async';
  });

  function sendEvent(name, data) {
    if (typeof gtag === 'function') gtag('event', name, Object.assign({ page: pageName }, attribution, data || {}));
  }

  window.ABKABAnalytics = { track: sendEvent };

  function whatsappUrl(service, requestId) {
    var message = service ? 'Hello ABKAB, I would like to ask about ' + service + '.' : 'Hello ABKAB, I would like to discuss a service.';
    if (requestId) message += ' My request reference is ' + requestId + '.';
    return WHATSAPP_URL + '?text=' + encodeURIComponent(message);
  }

  var pageService = params.get('service') || '';
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
    if (pageService && !link.id) link.href = whatsappUrl(pageService);
    link.addEventListener('click', function () {
      sendEvent('whatsapp_clicked', { service: pageService || undefined, label: link.textContent.trim().slice(0, 80) });
    });
  });
  document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"],a[href*="contact.html"]').forEach(function (link) {
    link.addEventListener('click', function () { sendEvent('contact_clicked', { label: link.textContent.trim().slice(0, 80) }); });
  });
  document.querySelectorAll('a[href*="service="]').forEach(function (link) {
    link.addEventListener('click', function () {
      var destination = new URL(link.href, window.location.href);
      sendEvent('service_interest', { service: destination.searchParams.get('service') || 'selected' });
    });
  });
  if (pageService) sendEvent('service_view', { service: pageService });

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
  var contactTrackingLink = document.getElementById('contactTrackingLink');
  var requestedContactService = params.get('service');
  var contactServiceSelect = document.getElementById('service');
  if (requestedContactService && contactServiceSelect) {
    var normalizedService = requestedContactService.trim().toLowerCase();
    Array.prototype.some.call(contactServiceSelect.options, function (option) {
      if (option.text.trim().toLowerCase() === normalizedService || option.value.trim().toLowerCase() === normalizedService) {
        contactServiceSelect.value = option.value || option.text;
        return true;
      }
      return false;
    });
    if (!contactServiceSelect.value) {
      var customOption = new Option(requestedContactService, requestedContactService, true, true);
      contactServiceSelect.add(customOption);
    }
  }
  if (params.get('sent') === '1' && contactStatus) {
    contactStatus.textContent = 'Thank you - your request has been sent. We will review it and respond as soon as possible.';
    contactStatus.className = 'form-status success';
    history.replaceState({}, '', window.location.pathname);
  }
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      sendEvent('request_started', { service: value('service') || 'contact' });
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
      event.preventDefault();
      contactForm.dataset.submitting = 'true';
      if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
      }
      contactStatus.textContent = 'Saving your request securely...';
      contactStatus.className = 'form-status';
      postJson('/api/submit-request', {
        serviceType: value('service'), customerName: value('name'), phone: value('phone'), email: value('email'),
        preferredContactMethod: value('contactMethod'), location: value('location'), address: value('address'), state: value('state'), lga: value('lga'),
        requestDetails: { budget: value('budget'), message: value('message') }
      }).then(function (data) {
        contactStatus.textContent = 'Thank you. Your request ID is ' + data.requestId + '. We will review it and respond soon.';
        contactStatus.className = 'form-status success';
        if (contactTrackingLink && data.requestId) {
          contactTrackingLink.href = 'track-request.html?tracking=' + encodeURIComponent(data.requestId);
          contactTrackingLink.hidden = false;
        }
        sendEvent('contact_request_submitted', { request_id: data.requestId });
        sendEvent('request_submitted', { service: value('service') || 'contact', request_id: data.requestId });
      }).catch(function (error) {
        console.error('Contact request submission failed', error.message);
        contactForm.dataset.submitting = 'false';
        if (button) { button.disabled = false; button.innerHTML = 'Send Request <i class="fas fa-arrow-right"></i>'; }
        contactStatus.textContent = error.message;
        contactStatus.className = 'form-status error';
      });
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
      event.preventDefault();
      if (cacForm.dataset.submitting === 'true') return;
      cacForm.dataset.submitting = 'true';
      var cacButton = cacForm.querySelector('[type="submit"]');
      if (cacButton) { cacButton.disabled = true; cacButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...'; }
      cacStatus.textContent = 'Saving your request securely...';
      cacStatus.className = 'form-status';
      var cacDetails = collectFormDetails(cacForm);
      delete cacDetails['NIN Number'];
      Object.keys(cacDetails).forEach(function (key) { if (/ File$/.test(key)) delete cacDetails[key]; });
      postJson('/api/submit-request', {
        serviceType: 'CAC Business Name Registration', customerName: value('cacName'), phone: value('cacPhone'), email: value('cacEmail'),
        preferredContactMethod: 'Phone / WhatsApp', location: value('businessState'), address: value('businessAddress'), state: value('businessState'), lga: value('businessLga'),
        description: value('nature'), requestDetails: cacDetails
      }).then(function (data) {
        var requestId = data.requestId;
        var requestIdField = document.getElementById('cacRequestId');
        if (requestIdField) requestIdField.value = requestId;
        var subject = cacForm.querySelector('[name="_subject"]');
        if (subject) subject.value = 'New CAC Request ' + requestId + ' - ABKAB Smart Solution';
        sendEvent('cac_form_submitted', { request_id: requestId });
        if (cacSuccess) sessionStorage.setItem('abkabCacSubmitted', '1');
        HTMLFormElement.prototype.submit.call(cacForm);
      }).catch(function (error) {
        console.error('CAC request submission failed', error.message);
        cacForm.dataset.submitting = 'false';
        if (cacButton) { cacButton.disabled = false; cacButton.innerHTML = 'Submit CAC Request <i class="fas fa-arrow-right"></i>'; }
        cacStatus.textContent = error.message;
        cacStatus.className = 'form-status error';
      });
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

  Object.assign(serviceConfigs, {
    'web-development': { title: 'Request Web Development', serviceName: 'Web Development', subject: 'New Web Development Request - ABKAB Smart Solution', cta: 'Request Web Development', intro: 'Tell us what you need. We will review your requirements and contact you.', whatsapp: ['businessName','websiteType','websiteDescription','pagesRequired','preferredFeatures','domainStatus','hostingStatus','designPreference','referenceWebsite','budgetRange','completionDate','ecommerceProducts','paymentGateway','deliveryOptions','customerAccounts','orderManagement'], fields: [
      {type:'input',id:'businessName',name:'Business/Organization Name',label:'Business/Organization Name',required:true}, {type:'select',id:'websiteType',name:'Website Type',label:'Website Type',required:true,options:['Company Website','E-commerce','Portfolio','Blog/News','School/Organization','Not Sure']}, {type:'textarea',id:'websiteDescription',name:'Business/Organization Description',label:'Business/Organization Description',required:true}, {type:'input',id:'pagesRequired',name:'Pages Required',label:'Pages Required',required:true}, {type:'textarea',id:'preferredFeatures',name:'Preferred Features',label:'Preferred Features'}, {type:'select',id:'domainStatus',name:'Domain Status',label:'Domain Status',required:true,options:['Already have a domain','Need a domain','Not sure']}, {type:'select',id:'hostingStatus',name:'Hosting Status',label:'Hosting Status',required:true,options:['Already have hosting','Need hosting','Not sure']}, {type:'input',id:'designPreference',name:'Design Preference',label:'Design Preference'}, {type:'input',id:'referenceWebsite',name:'Reference Website (optional)',label:'Reference Website (optional)',inputType:'url'}, {type:'select',id:'budgetRange',name:'Budget Range',label:'Budget Range',options:['Under ₦250,000','₦250,000 - ₦500,000','₦500,000 - ₦1,000,000','Above ₦1,000,000','Not sure']}, {type:'input',id:'completionDate',name:'Expected Completion Date',label:'Expected Completion Date',inputType:'date'}, {type:'input',id:'ecommerceProducts',name:'Number of Products',label:'Number of Products',visibleWhen:{field:'websiteType',value:'E-commerce'}}, {type:'input',id:'paymentGateway',name:'Payment Gateway',label:'Payment Gateway',visibleWhen:{field:'websiteType',value:'E-commerce'}}, {type:'input',id:'deliveryOptions',name:'Delivery/Shipping',label:'Delivery/Shipping',visibleWhen:{field:'websiteType',value:'E-commerce'}}, {type:'select',id:'customerAccounts',name:'Customer Account',label:'Customer Account',options:['Required','Not required','Not sure'],visibleWhen:{field:'websiteType',value:'E-commerce'}}, {type:'input',id:'orderManagement',name:'Order Management',label:'Order Management',visibleWhen:{field:'websiteType',value:'E-commerce'}}
    ]},
    networking: { title:'Request Networking & IT', serviceName:'Networking & IT', subject:'New Networking & IT Request - ABKAB Smart Solution', cta:'Request Networking Service', intro:'Share your current setup and what you need connected, secured or supported.', whatsapp:['organization','location','usersDevices','currentNetwork','networkType','routerSwitch','wifiRequirements','cabling','security','installation','maintenance','preferredDate','additionalRequirements'], fields:[{type:'input',id:'organization',name:'Organization/Business',label:'Organization/Business',required:true},{type:'input',id:'location',name:'Location',label:'Location',required:true},{type:'input',id:'usersDevices',name:'Number of Users/Devices',label:'Number of Users/Devices',required:true},{type:'textarea',id:'currentNetwork',name:'Current Network Setup',label:'Current Network Setup'},{type:'select',id:'networkType',name:'Required Network Type',label:'Required Network Type',required:true,options:['Office LAN','Wi-Fi Network','Structured Cabling','Server Network','Network Security','Not sure']},{type:'input',id:'routerSwitch',name:'Router/Switch Requirements',label:'Router/Switch Requirements'},{type:'textarea',id:'wifiRequirements',name:'Wi-Fi Requirements',label:'Wi-Fi Requirements'},{type:'textarea',id:'cabling',name:'Cabling Requirements',label:'Cabling Requirements'},{type:'textarea',id:'security',name:'Security Requirements',label:'Security Requirements'},{type:'select',id:'installation',name:'Installation Required?',label:'Installation Required?',options:['Yes','No','Not sure']},{type:'select',id:'maintenance',name:'Maintenance Required?',label:'Maintenance Required?',options:['Yes','No','Not sure']},{type:'input',id:'preferredDate',name:'Preferred Date',label:'Preferred Date',inputType:'date'},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    cloud: { title:'Request Cloud Services', serviceName:'Cloud Services', subject:'New Cloud Services Request - ABKAB Smart Solution', cta:'Request Cloud Service', intro:'Tell us about your infrastructure, cloud goals and support needs.', whatsapp:['organization','currentInfrastructure','cloudService','migration','storage','backup','users','security','cloudPlatform','provider','budget','additionalRequirements'], fields:[{type:'input',id:'organization',name:'Business/Organization',label:'Business/Organization',required:true},{type:'textarea',id:'currentInfrastructure',name:'Current Infrastructure',label:'Current Infrastructure'},{type:'select',id:'cloudService',name:'Cloud Service Required',label:'Cloud Service Required',required:true,options:['Cloud Hosting','Cloud Storage','Cloud Backup','Cloud Migration','Cloud Applications','Cloud Security','Not sure']},{type:'select',id:'migration',name:'Migration Required?',label:'Migration Required?',options:['Yes','No','Not sure']},{type:'input',id:'storage',name:'Storage Requirements',label:'Storage Requirements'},{type:'textarea',id:'backup',name:'Backup Requirements',label:'Backup Requirements'},{type:'input',id:'users',name:'Number of Users',label:'Number of Users'},{type:'textarea',id:'security',name:'Security Requirements',label:'Security Requirements'},{type:'select',id:'cloudPlatform',name:'Preferred Cloud Platform',label:'Preferred Cloud Platform',options:['AWS','Microsoft Azure','Google Cloud','Other','Not sure']},{type:'input',id:'provider',name:'Current Hosting/Cloud Provider',label:'Current Hosting/Cloud Provider'},{type:'select',id:'budget',name:'Budget Range',label:'Budget Range',options:['Under ₦250,000','₦250,000 - ₦500,000','Above ₦500,000','Not sure']},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    cac: { title:'Request CAC Registration', serviceName:'CAC Registration', subject:'New CAC Registration Request - ABKAB Smart Solution', cta:'Request CAC Service', intro:'Tell us about the business and registration support you need.', whatsapp:['businessName','businessType','cacService','proposedNames','businessActivity','businessAddress','ownerInfo','owners','existingCac','tinStatus','additionalRequirements'], fields:[{type:'input',id:'businessName',name:'Business Name',label:'Business Name',required:true},{type:'select',id:'businessType',name:'Business Type',label:'Business Type',required:true,options:['Business Name','Limited Liability Company','Incorporated Trustees','Not sure']},{type:'select',id:'cacService',name:'CAC Service Required',label:'CAC Service Required',required:true,options:['New registration','Annual return','Change of details','Status search','Other']},{type:'textarea',id:'proposedNames',name:'Proposed Business Names',label:'Proposed Business Names',required:true},{type:'textarea',id:'businessActivity',name:'Business Activity/Nature',label:'Business Activity/Nature',required:true},{type:'textarea',id:'businessAddress',name:'Business Address',label:'Business Address',required:true},{type:'textarea',id:'ownerInfo',name:'Owner/Director Information',label:'Owner/Director Information',required:true},{type:'input',id:'owners',name:'Number of Owners/Directors',label:'Number of Owners/Directors'},{type:'select',id:'existingCac',name:'Existing CAC Status',label:'Existing CAC Status',options:['No existing registration','Existing registration','Not sure']},{type:'select',id:'tinStatus',name:'TIN Status',label:'TIN Status',options:['Have TIN','Need TIN support','Not sure']},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    branding: { title:'Request Branding & Printing', serviceName:'Branding & Printing', subject:'New Branding & Printing Request - ABKAB Smart Solution', cta:'Request Branding & Printing', intro:'Share the brand or print item, specifications and deadline.', whatsapp:['organization','brandingService','designRequired','printingRequired','quantity','size','material','color','deadline','additionalRequirements'], fields:[{type:'input',id:'organization',name:'Business/Organization',label:'Business/Organization',required:true},{type:'select',id:'brandingService',name:'Branding/Printing Service Required',label:'Branding/Printing Service Required',required:true,options:['Logo','Brand identity','Business card','Flyer','Banner','Company profile','Document printing','Other']},{type:'select',id:'designRequired',name:'Design Required?',label:'Design Required?',options:['Yes','No','Not sure']},{type:'select',id:'printingRequired',name:'Printing Required?',label:'Printing Required?',options:['Yes','No','Not sure']},{type:'input',id:'quantity',name:'Quantity',label:'Quantity'},{type:'input',id:'size',name:'Size',label:'Size'},{type:'input',id:'material',name:'Material Type',label:'Material Type'},{type:'select',id:'color',name:'Color Preference',label:'Color Preference',options:['Full color','Black and white','Not sure']},{type:'input',id:'deadline',name:'Deadline',label:'Deadline',inputType:'date'},{type:'file',id:'referenceUpload',name:'attachment',label:'Upload Design/Reference',accept:'.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    marketing: { title:'Request Digital Marketing', serviceName:'Digital Marketing', subject:'New Digital Marketing Request - ABKAB Smart Solution', cta:'Request Digital Marketing', intro:'Tell us what you want to achieve and who you want to reach.', whatsapp:['organization','marketingGoal','platform','socialPresence','audience','marketingService','contentRequired','advertisingRequired','monthlyBudget','campaignDuration','additionalRequirements'], fields:[{type:'input',id:'organization',name:'Business/Organization',label:'Business/Organization',required:true},{type:'textarea',id:'marketingGoal',name:'Marketing Goal',label:'Marketing Goal',required:true},{type:'input',id:'platform',name:'Platform Required',label:'Platform Required',required:true},{type:'textarea',id:'socialPresence',name:'Current Social Media Presence',label:'Current Social Media Presence'},{type:'textarea',id:'audience',name:'Target Audience',label:'Target Audience',required:true},{type:'select',id:'marketingService',name:'Service Required',label:'Service Required',required:true,options:['Social media management','Content strategy','Paid advertising','SEO','Full digital marketing','Not sure']},{type:'select',id:'contentRequired',name:'Content Required?',label:'Content Required?',options:['Yes','No','Not sure']},{type:'select',id:'advertisingRequired',name:'Advertising Required?',label:'Advertising Required?',options:['Yes','No','Not sure']},{type:'select',id:'monthlyBudget',name:'Monthly Marketing Budget',label:'Monthly Marketing Budget',options:['Under ₦100,000','₦100,000 - ₦250,000','Above ₦250,000','Not sure']},{type:'input',id:'campaignDuration',name:'Campaign Duration',label:'Campaign Duration'},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] }
  });

  Object.assign(serviceConfigs, {
    printing: { title:'Request Printing Services', serviceName:'Printing Services', subject:'New Printing Request - ABKAB Smart Solution', cta:'Request Printing Service', intro:'Share the print item, specifications and delivery deadline.', whatsapp:['printingType','quantity','size','material','color','deadline','printingRequirements'], fields:[{type:'select',id:'printingType',name:'Service Type',label:'Service Type',required:true,options:['Document printing','Flyer','Banner','Business card','Poster','Brochure','Other']},{type:'input',id:'quantity',name:'Quantity',label:'Quantity',required:true},{type:'input',id:'size',name:'Size',label:'Size'},{type:'input',id:'material',name:'Material',label:'Material'},{type:'select',id:'color',name:'Color Preference',label:'Color Preference',options:['Full color','Black and white','Not sure']},{type:'input',id:'deadline',name:'Deadline',label:'Deadline',inputType:'date'},{type:'file',id:'referenceUpload',name:'attachment',label:'Reference/Upload',accept:'.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'},{type:'textarea',id:'printingRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    'digital-business': { title:'Request Digital Business Service', serviceName:'Digital Business Services', subject:'New Digital Business Request - ABKAB Smart Solution', cta:'Request Digital Business Service', intro:'Tell us which business task or digital workflow needs support.', whatsapp:['businessService','businessDescription','deadline','additionalRequirements'], fields:[{type:'select',id:'businessService',name:'Service Type',label:'Service Type',required:true,options:['Account support','POS support','Digital payment support','Business documentation','Online application','Other']},{type:'textarea',id:'businessDescription',name:'What do you need?',label:'What do you need?',required:true},{type:'input',id:'deadline',name:'Preferred Date',label:'Preferred Date',inputType:'date'},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] },
    identity: { title:'Request Identity & Registration Support', serviceName:'Identity & Registration Support', subject:'New Identity Support Request - ABKAB Smart Solution', cta:'Request Identity Support', intro:'Share the registration or identity process where you need guidance.', whatsapp:['identityService','identityDescription','location','preferredDate','additionalRequirements'], fields:[{type:'select',id:'identityService',name:'Service Type',label:'Service Type',required:true,options:['NIN registration support','NIN update support','BVN support','Identity verification','Online registration','Other']},{type:'textarea',id:'identityDescription',name:'What do you need?',label:'What do you need?',required:true},{type:'input',id:'preferredDate',name:'Preferred Date',label:'Preferred Date',inputType:'date'},{type:'textarea',id:'additionalRequirements',name:'Additional Requirements',label:'Additional Requirements'}] }
  });

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderField(field) {
    var required = field.required ? ' <span class="required">*</span>' : '';
    var html = '<div class="field ' + (field.type === 'textarea' || field.type === 'checkboxes' || field.type === 'file' ? 'full' : '') + '"' + (field.visibleWhen ? ' data-visible-when="' + esc(field.visibleWhen.field) + ':' + esc(field.visibleWhen.value) + '" hidden' : '') + '>';
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
      html += '<input id="' + field.id + '" name="' + esc(field.name) + '" type="file" accept="' + esc(field.accept) + '" data-max-size="3670016" data-empty-text="JPG, JPEG, PNG or PDF. Maximum 3.5 MB."><div class="file-meta" id="' + field.id + 'Meta">JPG, JPEG, PNG or PDF. Maximum 3.5 MB.</div>';
    } else {
      html += '<input id="' + field.id + '" name="' + esc(field.name) + '" type="' + esc(field.inputType || 'text') + '" ' + (field.min ? 'min="' + esc(field.min) + '"' : '') + ' ' + (field.placeholder ? 'placeholder="' + esc(field.placeholder) + '"' : '') + ' ' + (field.required ? 'required' : '') + '>';
    }
    html += '<span class="field-error" id="' + field.id + 'Error"></span></div>';
    return html;
  }

  function updateConditionalFields(form) {
    form.querySelectorAll('[data-visible-when]').forEach(function (wrap) {
      var rule = wrap.dataset.visibleWhen.split(':');
      var control = form.querySelector('#' + rule[0]);
      var visible = control && control.value === rule.slice(1).join(':');
      wrap.hidden = !visible;
      wrap.querySelectorAll('input,select,textarea').forEach(function (el) { if (!el.dataset.optional) el.required = visible && el.dataset.initialRequired === 'true'; if (!visible) el.value = ''; });
    });
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

  function postJson(url, payload) {
    if (window.location.protocol === 'file:') return Promise.reject(new Error('This request form needs the website server. Open the deployed website, or run the project through a local web server before submitting.'));
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () {
      throw new Error('The request service could not be reached. Please check your connection and try again.');
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed.');
        return data;
      });
    });
  }

  function uploadRequestAttachments(form, statusElement) {
    var inputs = Array.prototype.filter.call(form.querySelectorAll('input[type="file"]'), function (input) { return input.files && input.files[0]; });
    if (!inputs.length) return Promise.resolve([]);
    function read(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = function () { reject(new Error('The selected attachment could not be read.')); }; reader.readAsDataURL(file); }); }
    statusElement.textContent = 'Uploading attachment securely...';
    return Promise.all(inputs.map(function (input) { var file = input.files[0]; return read(file).then(function (dataUrl) { return postJson('/api/upload-request-attachment', { fileName: file.name, contentType: file.type, size: file.size, dataUrl: dataUrl }); }).then(function (data) { return data.attachment; }); }));
  }

  function collectFormDetails(form) {
    var details = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name.charAt(0) === '_') return;
      if (el.type === 'file') {
        var file = el.files && el.files[0];
        if (file) details[el.id + ' File'] = file.name + ' (' + file.type + ', ' + file.size + ' bytes)';
        return;
      }
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        details[el.name] = details[el.name] ? details[el.name] + ', ' + el.value : el.value;
        return;
      }
      details[el.name] = el.value.trim();
    });
    return details;
  }

  function renderTrackingCard(canvas, request) {
    var context = canvas.getContext('2d');
    context.fillStyle = '#f7f9fd'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0c2a76'; context.fillRect(0, 0, canvas.width, 250);
    context.fillStyle = '#e31a1a'; context.fillRect(0, 250, canvas.width, 14);
    var logo = new Image();
    logo.onload = function () { context.drawImage(logo, 90, 48, 380, 136); drawTrackingCardText(context, request); };
    logo.onerror = function () { drawTrackingCardText(context, request); };
    logo.src = 'images/logo.svg';
  }

  function drawTrackingCardText(context, request) {
    function dateLabel(value) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    context.fillStyle = '#ffffff'; context.font = '800 42px Inter, Arial, sans-serif'; context.fillText('REQUEST TRACKING CARD', 90, 360);
    context.fillStyle = '#0c2a76'; context.font = '800 68px Inter, Arial, sans-serif'; context.fillText(request.requestId, 90, 470);
    context.fillStyle = '#526078'; context.font = '700 27px Inter, Arial, sans-serif'; context.fillText('TRACKING NUMBER', 94, 515);
    context.fillStyle = '#14213d'; context.font = '800 34px Inter, Arial, sans-serif'; context.fillText('Service', 90, 630); context.font = '500 34px Inter, Arial, sans-serif'; context.fillText(request.serviceType, 330, 630);
    context.font = '800 34px Inter, Arial, sans-serif'; context.fillText('Submitted', 90, 710); context.font = '500 34px Inter, Arial, sans-serif'; context.fillText(dateLabel(request.createdAt), 330, 710);
    context.font = '800 34px Inter, Arial, sans-serif'; context.fillText('Status', 90, 790); context.fillStyle = '#e31a1a'; context.font = '800 38px Inter, Arial, sans-serif'; context.fillText(request.status.replace(/_/g, ' '), 330, 790);
    context.fillStyle = '#14213d'; context.font = '800 34px Inter, Arial, sans-serif'; context.fillText('Last updated', 90, 870); context.font = '500 34px Inter, Arial, sans-serif'; context.fillText(dateLabel(request.updatedAt), 330, 870);
    context.fillStyle = '#526078'; context.font = '500 28px Inter, Arial, sans-serif'; context.fillText('Keep this card safe. Use your Tracking Number to track your request.', 90, 985); context.font = '700 27px Inter, Arial, sans-serif'; context.fillText('www.abkabsmartsolution.site', 90, 1065);
  }

  function prepareTrackingCardActions(request) {
    var save = document.getElementById('downloadTrackingCard'); var image = document.getElementById('saveTrackingImage'); var share = document.getElementById('shareSubmittedCard');
    if (!save || !image || !share) return;
    var canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1125; canvas.hidden = true; document.body.appendChild(canvas); renderTrackingCard(canvas, request);
    function imageBlob(callback) { canvas.toBlob(callback, 'image/png'); }
    function download() { imageBlob(function (blob) { var link = document.createElement('a'); link.download = request.requestId + '-tracking-card.png'; link.href = URL.createObjectURL(blob); link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000); }); }
    save.onclick = download; image.onclick = download; share.hidden = !navigator.share; share.onclick = function () { imageBlob(function (blob) { navigator.share({ title: 'ABKAB Request Tracking Card', text: request.requestId, files: [new File([blob], request.requestId + '-tracking-card.png', { type: 'image/png' })] }).catch(function () {}); }); };
  }

  function setupRequestForm() {
    if (!requestForm || !serviceFields) return;
    var requestedKey = params.get('service') || 'website';
    requestedKey = { website: 'web-development', digital: 'digital-business', 'digital-business': 'digital-business', branding: 'branding', networking: 'networking', cloud: 'cloud', printing: 'printing', cac: 'cac', identity: 'identity', 'graphic-design': 'branding', computer: 'networking', 'digital-support': 'digital-business' }[requestedKey] || requestedKey;
    var key = Object.prototype.hasOwnProperty.call(serviceConfigs, requestedKey) ? requestedKey : 'web-development';
    var config = serviceConfigs[key];
    var reference = params.get('ref') || sessionStorage.getItem('abkabRequestReference') || '';

    requestForm.action = '/api/submit-request';
    requestTitle.textContent = config.title;
    requestIntro.textContent = config.intro;
    formTitle.textContent = config.title;
    document.getElementById('serviceRequirementsLegend').textContent = config.serviceName + ' Requirements';
    var fallbackInfo = document.getElementById('noScriptServiceInfo');
    if (fallbackInfo) fallbackInfo.hidden = true;
    requestSubmit.innerHTML = esc(config.cta) + ' <i class="fas fa-arrow-right"></i>';
    serviceFields.innerHTML = config.fields.map(renderField).join('');
    serviceFields.querySelectorAll('input,select,textarea').forEach(function (el) { el.dataset.initialRequired = String(el.required); });
    updateConditionalFields(requestForm);
    requestForm.addEventListener('change', function () { updateConditionalFields(requestForm); });
    document.getElementById('serviceNameField').value = config.serviceName;
    document.getElementById('serviceKeyField').value = key;
    document.getElementById('requestSubject').value = config.subject;
    document.getElementById('requestAutoresponse').value = 'Thank you for choosing ABKAB Smart Solution.\n\nWe have received your ' + config.serviceName + ' request. Our team will review it and contact you using your preferred contact method.\n\nABKAB Smart Solution\n' + SITE_URL;

    sendEvent('service_request_viewed', { service: key });
    sendEvent('service_view', { service: config.serviceName });

    requestForm.querySelectorAll('input,select,textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        if (!requestStarted) {
          requestStarted = true;
          sendEvent('service_request_form_started', { service: key });
          sendEvent('request_started', { service: config.serviceName });
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

      var lines = [
        'ABKAB SMART SOLUTION',
        'Service Request',
        '',
        'Service: ' + config.serviceName,
        'Request submitted through the ABKAB Smart Solution website.',
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
      event.preventDefault();
      requestForm.dataset.submitting = 'true';
      requestSubmit.disabled = true;
      requestSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';
      requestStatus.textContent = 'Saving your request securely...';
      requestStatus.className = 'form-status';
      var details = collectFormDetails(requestForm);
      uploadRequestAttachments(requestForm, requestStatus).then(function (attachments) { requestStatus.textContent = 'Saving your request securely...'; return postJson('/api/submit-request', {
        serviceType: config.serviceName, customerName: requestValue('requestName'), phone: requestValue('requestPhone'),
        email: requestValue('requestEmail'), preferredContactMethod: requestValue('contactMethod'), location: requestValue('requestLocation'), address: requestValue('requestAddress'), state: requestValue('requestState'), lga: requestValue('requestLga'), requestDetails: details, attachments: attachments
      }); }).then(function (data) {
        var tracking = {
          trackingNumber: data.trackingNumber || data.requestId,
          customerName: data.customerName,
          serviceRequested: data.serviceRequested || config.serviceName,
          status: data.status || 'PENDING',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          customerNote: data.customerNote || ''
        };
        if (requestReferenceNote) requestReferenceNote.textContent = 'Your Tracking Number: ' + tracking.trackingNumber;
        document.getElementById('successTrackingNumber').textContent = tracking.trackingNumber;
        document.getElementById('successCustomerName').textContent = tracking.customerName;
        document.getElementById('successServiceName').textContent = tracking.serviceRequested;
        document.getElementById('successRequestStatus').textContent = window.ABKABTrackingSlip.labelStatus(tracking.status);
        document.getElementById('successSubmissionDate').textContent = window.ABKABTrackingSlip.dateText(tracking.createdAt);
        document.getElementById('copyTrackingNumber').onclick = function () {
          navigator.clipboard.writeText(tracking.trackingNumber).then(function () { document.getElementById('submissionCardStatus').textContent = 'Tracking number copied.'; }).catch(function () { document.getElementById('submissionCardStatus').textContent = 'Copy unavailable.'; });
        };
        document.getElementById('downloadTrackingSlip').onclick = function () {
          window.ABKABTrackingSlip.download(tracking).then(function () { document.getElementById('submissionCardStatus').textContent = 'Tracking slip downloaded.'; }).catch(function (error) { document.getElementById('submissionCardStatus').textContent = error.message; });
        };
        document.getElementById('trackRequestLink').href = 'track-request.html?tracking=' + encodeURIComponent(tracking.trackingNumber);
        if (requestWhatsappLink) requestWhatsappLink.href = WHATSAPP_URL + '?text=' + encodeURIComponent(lines.join('\n').replace('Request submitted through the ABKAB Smart Solution website.', 'Request ID: ' + data.requestId));
        requestForm.closest('.section').hidden = true;
        requestSuccess.hidden = false;
        requestSuccess.scrollIntoView({ block: 'start' });
        sendEvent('service_request_submitted', { service: key, request_id: data.requestId });
        sendEvent('request_submitted', { service: config.serviceName, request_id: data.requestId });
      }).catch(function (error) {
        console.error('Service request submission failed', error.message);
        requestForm.dataset.submitting = 'false';
        requestSubmit.disabled = false;
        requestSubmit.innerHTML = esc(config.cta) + ' <i class="fas fa-arrow-right"></i>';
        requestStatus.textContent = error.message;
        requestStatus.className = 'form-status error';
      });
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
    var revealItems = document.querySelectorAll('.service-card,.service-detail,.mini-service,.project-card,.reason,.process-step,.testimonial-empty,.acquisition-card,.trust-card,.cta-band,main .section:not(.page-hero) .section-heading,.about-panel,.quick-item,.contact-form,.cac-layout,.request-layout,.request-result');
    revealItems.forEach(function (item, index) {
      item.classList.add('reveal');
      item.style.setProperty('--reveal-delay', Math.min(index % 6, 5) * 70 + 'ms');
      observer.observe(item);
    });
  }
});
