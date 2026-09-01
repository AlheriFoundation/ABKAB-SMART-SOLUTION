// Main JS for ABKAB SMART SOLUTION — improved accessibility and interactions
document.addEventListener('DOMContentLoaded', function(){
  // NAVIGATION: accessible toggles using aria-controls
  document.querySelectorAll('.nav-toggle').forEach(function(btn){
    var targetId = btn.getAttribute('aria-controls');
    var target = targetId ? document.getElementById(targetId) : btn.nextElementSibling;
    btn.addEventListener('click', function(){
      var isOpen = target.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // close when pressing Escape
    btn.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && target.classList.contains('open')){
        target.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
        btn.focus();
      }
    });
  });

  // Close mobile nav when link clicked inside nav
  document.querySelectorAll('.main-nav a').forEach(function(link){
    link.addEventListener('click', function(){
      var nav = link.closest('.main-nav');
      if(nav && nav.classList.contains('open')){
        nav.classList.remove('open');
        // update any toggles that control this nav
        var id = nav.id;
        if(id){
          var toggle = document.querySelector('[aria-controls="'+id+'"]');
          if(toggle) toggle.setAttribute('aria-expanded','false');
        }
      }
    });
  });

  // Click outside to close mobile nav
  document.addEventListener('click', function(e){
    document.querySelectorAll('.main-nav.open').forEach(function(nav){
      if(!nav.contains(e.target)){
        // don't close if clicking the toggle
        var id = nav.id;
        var toggle = id ? document.querySelector('[aria-controls="'+id+'"]') : null;
        if(toggle && toggle.contains(e.target)) return;
        nav.classList.remove('open');
        if(toggle) toggle.setAttribute('aria-expanded','false');
      }
    });
  });

  // Close on Escape key globally
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      document.querySelectorAll('.main-nav.open').forEach(function(nav){
        nav.classList.remove('open');
        var id = nav.id;
        var toggle = id ? document.querySelector('[aria-controls="'+id+'"]') : null;
        if(toggle) toggle.setAttribute('aria-expanded','false');
      });
    }
  });

  // Smooth scroll for internal anchor links (improved)
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = a.getAttribute('href');
      if(href && href.length>1){
        var target = document.querySelector(href);
        if(target){
          e.preventDefault();
          target.scrollIntoView({behavior:'smooth',block:'start'});
          target.setAttribute('tabindex','-1');
          target.focus({preventScroll:true});
        }
      }
    });
  });

  // Contact form - FormSubmit email delivery with validation and loading state.
  var form = document.getElementById('contactForm');
  if(form){
    var status = document.getElementById('formStatus');
    if(!status){
      status = document.createElement('p');
      status.id = 'formStatus';
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }

    function setStatus(message, isError){
      status.textContent = message;
      status.style.display = 'block';
      status.style.marginTop = '12px';
      status.style.fontSize = '0.95rem';
      status.style.color = isError ? '#b42318' : '#166534';
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();

      var nameField = form.querySelector('[name="name"]');
      var emailField = form.querySelector('[name="email"]');
      var phoneField = form.querySelector('[name="phone"]');
      var serviceField = form.querySelector('[name="service"]');
      var messageField = form.querySelector('[name="message"]');
      var btn = form.querySelector('button[type="submit"]');

      var fullName = (nameField ? nameField.value : '').trim();
      var emailAddress = (emailField ? emailField.value : '').trim();
      var phoneNumber = (phoneField ? phoneField.value : '').trim();
      var serviceNeeded = (serviceField ? serviceField.value : '').trim();
      var messageText = (messageField ? messageField.value : '').trim();

      if(!fullName || !emailAddress || !messageText){
        setStatus('Please fill in your full name, email address, and message.', true);
        return;
      }

      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!emailPattern.test(emailAddress)){
        setStatus('Please enter a valid email address.', true);
        return;
      }

      if(phoneNumber && phoneNumber.replace(/[^0-9+]/g, '').length < 7){
        setStatus('Please enter a valid phone number.', true);
        return;
      }

      var originalText = btn ? btn.textContent : 'Send Message';
      if(btn){
        btn.disabled = true;
        btn.textContent = 'Sending...';
      }
      setStatus('Sending your message. Please wait...', false);

      var formData = new FormData();
      formData.append('Full Name', fullName);
      formData.append('Email Address', emailAddress);
      formData.append('Phone Number', phoneNumber || 'Not provided');
      formData.append('Selected Service', serviceNeeded || 'Not specified');
      formData.append('Project Description', messageText);
      formData.append('_subject', 'New Request a Quote - ABKAB Smart Solution');
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');

      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      })
        .then(function(response){
          if(!response.ok) throw new Error('Email delivery failed');
          return response.json();
        })
        .then(function(){
          setStatus('✅ Your message has been sent successfully. We will get back to you soon.', false);
          form.reset();
        })
        .catch(function(){
          setStatus('❌ Something went wrong while sending your message. Please try again or contact us directly via WhatsApp.', true);
        })
        .finally(function(){
          if(btn){
            btn.disabled = false;
            btn.textContent = originalText;
          }
        });
    });
  }

  // WhatsApp button hook - easy to configure
  var whatsappBtn = document.getElementById('whatsappBtn');
  if(whatsappBtn){
    var phone = '+2349061222869';
    whatsappBtn.setAttribute('href','https://wa.me/'+phone.replace(/[^0-9]/g,''));
  }

  // REVEAL ANIMATIONS: observe elements and add .in-view when visible
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.12});

  document.querySelectorAll('.card, .service-card, .project-card, .cta, .hero-content').forEach(function(el){
    el.classList.add('reveal');
    observer.observe(el);
  });
});
