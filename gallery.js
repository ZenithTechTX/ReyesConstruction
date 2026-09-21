/* Project gallery: one tab per service (shows that service's photos only) + lightbox. Photos come from gallery-data.js (see update-gallery.ps1). */
(function () {
  var data = window.GALLERY;
  var section = document.getElementById('gallery');
  var navLinks = document.querySelectorAll('a[href="#gallery"]');

  // No photos yet -> hide the section and its nav link.
  if (!data || !data.items || !data.items.length) {
    section.hidden = true;
    navLinks.forEach(function (a) { a.hidden = true; });
    return;
  }

  var labels = {};
  data.categories.forEach(function (c) { labels[c.id] = c.label; });
  var cats = data.categories.filter(function (c) {
    return data.items.some(function (i) { return i.cat === c.id; });
  });

  var filters = document.getElementById('filters');
  var grid = document.getElementById('gallery-grid');
  var visible = [];

  // Filter tabs (skipped when there is only one service)
  if (cats.length > 1) {
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter';
      b.textContent = c.label;
      b.dataset.cat = c.id;
      b.setAttribute('aria-pressed', 'false');
      filters.appendChild(b);
    });
  } else {
    filters.hidden = true;
  }

  // Photo tiles
  var shots = data.items.map(function (it, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'shot';
    b.dataset.i = i;
    b.dataset.cat = it.cat;
    b.setAttribute('aria-label', 'View photo: ' + it.title);

    var img = new Image();
    img.src = it.src;
    img.alt = it.title + ' - ' + labels[it.cat] + ' project';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (it.w && it.h) { img.width = it.w; img.height = it.h; }

    var cap = document.createElement('span');
    cap.className = 'shot__cap';
    var small = document.createElement('small');
    small.textContent = labels[it.cat];
    var strong = document.createElement('strong');
    strong.textContent = it.title;
    cap.appendChild(small);
    cap.appendChild(strong);

    b.appendChild(img);
    b.appendChild(cap);
    grid.appendChild(b);
    return b;
  });

  function applyFilter(cat) {
    visible = [];
    shots.forEach(function (s, i) {
      var show = s.dataset.cat === cat;
      s.hidden = !show;
      if (show) visible.push(i);
    });
    filters.querySelectorAll('.filter').forEach(function (f) {
      f.setAttribute('aria-pressed', String(f.dataset.cat === cat));
    });
  }
  applyFilter(cats[0].id);

  filters.addEventListener('click', function (e) {
    var f = e.target.closest('.filter');
    if (f) applyFilter(f.dataset.cat);
  });

  // Lightbox
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('figcaption');
  var pos = 0;
  var lastFocus = null;

  function show(p) {
    pos = (p + visible.length) % visible.length;
    var it = data.items[visible[pos]];
    lbImg.src = it.src;
    lbImg.alt = it.title + ' - ' + labels[it.cat] + ' project';
    lbCap.textContent = labels[it.cat] + ' · ' + it.title + '  (' + (pos + 1) + ' / ' + visible.length + ')';
  }
  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    show(visible.indexOf(i));
    lb.querySelector('.lb__close').focus();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  grid.addEventListener('click', function (e) {
    var s = e.target.closest('.shot');
    if (s) open(Number(s.dataset.i));
  });
  lb.addEventListener('click', function (e) {
    if (e.target.closest('.lb__close') || e.target === lb) close();
    else if (e.target.closest('.lb__prev')) show(pos - 1);
    else if (e.target.closest('.lb__next')) show(pos + 1);
  });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(pos - 1);
    else if (e.key === 'ArrowRight') show(pos + 1);
  });
  var x0 = null;
  lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
