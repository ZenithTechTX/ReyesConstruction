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

  // Contact form -> opens the visitor's email app with the message pre-filled.
  // (Static site: swap this for a form service endpoint if you want in-page submission.)
  var form = document.getElementById('form');
  var status = document.getElementById('status');
  var TO = 'reyesconstruction.info@gmail.com';

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
      status.textContent = 'Please fill in your name, a valid email, and a short message.';
      status.classList.add('is-error');
      f[bad[0]].focus();
      return;
    }
    status.classList.remove('is-error');

    var subject = 'Free estimate request: ' + f.service.value;
    var body = [
      'Name: ' + f.name.value.trim(),
      'Phone: ' + (f.phone.value.trim() || '—'),
      'Email: ' + f.email.value.trim(),
      'Service: ' + f.service.value,
      '',
      f.message.value.trim()
    ].join('\n');

    status.textContent = 'Opening your email app — just press send. Or call (713) 430-6098.';
    window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
  form.addEventListener('input', function (e) { e.target.classList.remove('is-invalid'); });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
