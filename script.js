(function () {
  var doc = document.documentElement;
  doc.classList.add('js');

  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  // Nav background once scrolled
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveal (staggered within each group)
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) {
      var siblings = el.parentElement.querySelectorAll(':scope > .reveal');
      el.style.setProperty('--d', Array.prototype.indexOf.call(siblings, el) * 0.1 + 's');
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Service quick-links preselect the form dropdown
  var select = document.getElementById('service');
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () { select.value = a.getAttribute('data-service'); });
  });

  // Contact form -> POST /api/contact (Cloudflare Worker emails it to the owner).
  // If the API is unavailable (offline, not deployed yet), fall back to opening the visitor's email app.
  var form = document.getElementById('form');
  var status = document.getElementById('status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var TO = 'reyesconstruction.info@gmail.com';

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('is-error', !!isError);
  }

  function openEmailApp(data) {
    var subject = 'Free estimate request: ' + data.service;
    var body = [
      'Name: ' + data.name,
      'Phone: ' + (data.phone || '—'),
      'Email: ' + data.email,
      'Service: ' + data.service,
      '',
      data.message
    ].join('\n');
    setStatus('Opening your email app — just press send. Or call (713) 430-6098.', false);
    window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var bad = ['name', 'email', 'message'].filter(function (n) {
      var el = f[n];
      var ok = el.value.trim() && (n !== 'email' || /^\S+@\S+\.\S+$/.test(el.value.trim()));
      el.classList.toggle('is-invalid', !ok);
      return !ok;
    });
    if (bad.length) {
      setStatus('Please fill in your name, a valid email, and a short message.', true);
      f[bad[0]].focus();
      return;
    }

    var data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      service: f.service.value,
      message: f.message.value.trim(),
      website: f.website ? f.website.value : '' // honeypot: stays empty for real visitors
    };

    submitBtn.disabled = true;
    setStatus('Sending…', false);

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(
          function (body) { return { status: res.status, body: body }; },
          function () { return { status: res.status, body: null }; }
        );
      })
      .then(function (r) {
        if (r.body && r.body.ok) {
          form.reset();
          setStatus('Thank you! Your request was sent — we will contact you shortly.', false);
        } else if (r.status === 422 && r.body && r.body.error) {
          setStatus(r.body.error, true); // the server rejected something the visitor can fix
        } else {
          openEmailApp(data);
        }
      })
      .catch(function () { openEmailApp(data); })
      .then(function () { submitBtn.disabled = false; });
  });
  form.addEventListener('input', function (e) { e.target.classList.remove('is-invalid'); });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
