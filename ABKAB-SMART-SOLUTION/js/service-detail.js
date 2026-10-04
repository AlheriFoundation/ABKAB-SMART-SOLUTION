(function () {
  var params = new URLSearchParams(window.location.search);
  var key = params.get('service') || 'web-development';
  var content = {
    'web-development': ['Web Development', 'Build a clear, responsive website that helps your business look credible and grow online.', ['Business and company websites', 'E-commerce and customer journeys', 'Web applications, forms and integrations', 'Domain, hosting and ongoing support']],
    networking: ['Networking & IT', 'Keep your people, devices and workplace connected with a network planned for real use.', ['Office and structured networks', 'Wi-Fi, router and switch setup', 'Security, troubleshooting and maintenance', 'On-site installation and support']],
    cloud: ['Cloud Services', 'Move your systems and files to a dependable cloud setup with practical guidance.', ['Cloud hosting and storage', 'Migration and backup planning', 'Access, security and user management', 'Cloud platform and provider guidance']],
    cac: ['CAC Registration', 'Get focused support preparing your business registration information and documents.', ['Business name registration support', 'Business information and document preparation', 'Name and activity guidance', 'Follow-up support through submission']],
    branding: ['Branding & Printing', 'Present your business consistently across identity, design and physical materials.', ['Logo and brand identity design', 'Flyers, banners and business cards', 'Print specifications and production', 'Reference-led creative support']],
    marketing: ['Digital Marketing', 'Reach the right audience with clear content, platforms and campaigns.', ['Social media management', 'Content and campaign planning', 'Advertising and audience targeting', 'Performance-focused digital support']],
    'digital-business': ['Digital Business Services', 'Get practical help with the digital tasks and workflows that keep business moving.', ['Account and POS support', 'Digital payment guidance', 'Online applications', 'Business documentation']],
    identity: ['Identity & Registration Support', 'Get guidance for identity and registration processes through appropriate channels.', ['NIN registration support', 'BVN guidance', 'Identity verification', 'Online registration assistance']],
    printing: ['Printing & Documents', 'Prepare professional print and document materials with clear specifications.', ['Document printing', 'Flyers, banners and business cards', 'Binding and finishing', 'Reference-led production']]
  };
  var item = content[key] || content['web-development'];
  document.title = item[0] + ' | ABKAB Smart Solution';
  document.getElementById('serviceDetailTitle').textContent = item[0];
  document.getElementById('serviceDetailIntro').textContent = item[1];
  document.getElementById('serviceDetailHeading').textContent = item[0] + ' shaped around your goals.';
  document.getElementById('serviceFeatures').innerHTML = item[2].map(function (feature) { return '<li><i class="fas fa-check"></i>' + feature + '</li>'; }).join('');
  document.querySelectorAll('#serviceRequestLink,#serviceRequestLinkTwo,#serviceRequestLinkThree').forEach(function (link) { link.href = 'request.html?service=' + encodeURIComponent(key) + '#serviceRequestForm'; link.textContent = 'Request ' + item[0] + ' '; var icon = document.createElement('i'); icon.className = 'fas fa-arrow-right'; link.appendChild(icon); });
}());
