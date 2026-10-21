/* Inspirado em Timed Cards Opening, de Dilum Sanjaya:
   https://codepen.io/dilums/pen/NWodZMd. Animação própria com Web Animations. */
(function () {
  'use strict';

  var section = document.getElementById('ciclo');
  var grid = section && section.querySelector('.ciclo');
  if (!grid) return;

  // Os links originais são a única fonte dos 16 manuais e o fallback sem JS.
  var slides = Array.from(grid.querySelectorAll('.man')).map(function (link) {
    return {
      code: link.querySelector('.txt b').textContent,
      title: link.querySelector('.txt span').textContent,
      description: link.querySelector('.txt small').textContent,
      image: link.querySelector('img').getAttribute('src'),
      background: 'assets/ciclo/m' + link.querySelector('.txt b').textContent.trim().replace('.', '-') + '.webp',
      href: link.getAttribute('href')
    };
  });
  if (slides.length < 2) return;

  var tracks = ['Fundamentos', 'Busca e revisão', 'Dados e ferramentas', 'Escrita e entrega'];
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var duration = 8000;
  var current = 0;
  var timer = null;
  var progressAnimation = null;
  var paused = motion.matches;
  var hovered = false;
  var focused = false;
  var inView = false;
  var changing = false;
  var stage = document.createElement('div');
  stage.className = 'cycle';
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-roledescription', 'carrossel');
  stage.setAttribute('aria-label', 'O ciclo dos 16 manuais');
  stage.innerHTML = '<div class="cycle-images" aria-hidden="true"></div>' +
    '<div class="cycle-shade" aria-hidden="true"></div>' +
    '<div class="cycle-top"><span>Percurso da pesquisa</span><span>16 manuais · 4 trilhas</span></div>' +
    '<div class="cycle-copy"><span class="cycle-label"></span><h3 class="cycle-title"></h3>' +
    '<p class="cycle-description"></p><a class="btn cycle-link">Abrir manual ' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></div>' +
    '<div class="cycle-deck" role="group" aria-label="Próximas etapas"></div>' +
    '<div class="cycle-bottom">' +
    '<button type="button" class="cycle-control cycle-prev" aria-label="Manual anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>' +
    '<button type="button" class="cycle-control cycle-next" aria-label="Próximo manual"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>' +
    '<button type="button" class="cycle-control cycle-pause"></button>' +
    '<div class="cycle-progress" aria-hidden="true"><span></span></div>' +
    '<span class="cycle-count" aria-hidden="true"><b>01</b> / 16</span></div>' +
    '<p class="cycle-sr" role="status" aria-live="polite" aria-atomic="true"></p>';

  var images = stage.querySelector('.cycle-images');
  var copy = stage.querySelector('.cycle-copy');
  var label = stage.querySelector('.cycle-label');
  var title = stage.querySelector('.cycle-title');
  var description = stage.querySelector('.cycle-description');
  var link = stage.querySelector('.cycle-link');
  var deck = stage.querySelector('.cycle-deck');
  var count = stage.querySelector('.cycle-count b');
  var pause = stage.querySelector('.cycle-pause');
  var progress = stage.querySelector('.cycle-progress span');
  var status = stage.querySelector('[role="status"]');
  var trackNav = document.createElement('div');
  trackNav.className = 'cycle-tracks';
  trackNav.setAttribute('role', 'group');
  trackNav.setAttribute('aria-label', 'Ir para uma trilha do ciclo');

  tracks.forEach(function (name, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cycle-track';
    button.innerHTML = '<b>0' + (index + 1) + '</b>';
    button.appendChild(document.createTextNode(name));
    button.addEventListener('click', function () { select(index * 4, true); });
    trackNav.appendChild(button);
  });

  function picture(slide, thumbnail) {
    var img = document.createElement('img');
    img.className = 'cycle-image';
    img.alt = '';
    img.src = thumbnail ? slide.image : slide.background;
    img.decoding = 'async';
    return img;
  }

  function render() {
    var slide = slides[current];
    var track = Number(slide.code.charAt(0)) - 1;
    label.textContent = 'Trilha 0' + (track + 1) + ' · ' + tracks[track];
    title.textContent = slide.title;
    description.textContent = slide.description;
    link.href = slide.href;
    link.setAttribute('aria-label', 'Abrir manual: ' + slide.title);
    count.textContent = String(current + 1).padStart(2, '0');
    Array.from(trackNav.children).forEach(function (button, index) {
      button.setAttribute('aria-pressed', String(index === track));
    });

    deck.replaceChildren();
    for (var step = 1; step <= 3; step++) {
      var index = (current + step) % slides.length;
      var next = slides[index];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'cycle-card';
      card.dataset.index = index;
      card.setAttribute('aria-label', 'Ver etapa ' + (index + 1) + ' de 16: ' + next.title);
      var img = picture(next, true);
      img.className = '';
      card.appendChild(img);
      var text = document.createElement('span');
      text.className = 'cycle-card-copy';
      var code = document.createElement('small');
      code.textContent = 'MANUAL ' + next.code;
      var heading = document.createElement('strong');
      heading.textContent = next.title;
      text.append(code, heading);
      card.appendChild(text);
      deck.appendChild(card);
    }
    deck.scrollLeft = 0;
  }

  function stopTimer() {
    window.clearTimeout(timer);
    timer = null;
    if (progressAnimation) progressAnimation.cancel();
    progressAnimation = null;
  }

  function schedule() {
    stopTimer();
    if (paused || hovered || focused || !inView || document.hidden || changing) return;
    if (progress.animate) {
      progressAnimation = progress.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: duration, fill: 'forwards' }
      );
    }
    timer = window.setTimeout(function () { next(false); }, duration);
  }

  function select(index, manual, origin) {
    index = (index + slides.length) % slides.length;
    if (changing || index === current) return;
    stopTimer();
    changing = true;
    var old = images.firstElementChild;
    var incoming = picture(slides[index]);
    var frame = stage.getBoundingClientRect();
    var card = origin && origin.getBoundingClientRect();
    var restoreFocus = deck.contains(document.activeElement);
    current = index;
    images.appendChild(incoming);
    render();
    // Cartões são recriados em ordem; o foco passa para o manual em destaque.
    if (restoreFocus) link.focus({ preventScroll: true });
    if (manual) status.textContent = 'Manual ' + (current + 1) + ' de 16: ' + slides[current].title;

    function finish() {
      if (old) old.remove();
      changing = false;
      schedule();
    }
    if (motion.matches || !incoming.animate) { finish(); return; }

    var from = card ? {
      left: (card.left - frame.left) + 'px', top: (card.top - frame.top) + 'px',
      width: card.width + 'px', height: card.height + 'px', borderRadius: '15px', opacity: 1
    } : { transform: 'scale(1.06)', opacity: 0 };
    var to = card ? {
      left: '0px', top: '0px', width: '100%', height: '100%', borderRadius: '0px', opacity: 1
    } : { transform: 'scale(1)', opacity: 1 };
    var opening = incoming.animate([from, to], { duration: 760, easing: 'cubic-bezier(.22,.7,.2,1)' });
    copy.animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 560, easing: 'ease-out' });
    Array.from(deck.children).forEach(function (button, offset) {
      button.animate([{ opacity: 0, transform: 'translateX(32px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 500, delay: offset * 65, fill: 'backwards', easing: 'ease-out' });
    });
    opening.finished.then(finish, finish);
  }

  function next(manual) { select(current + 1, manual, deck.firstElementChild); }
  function updatePause() {
    pause.setAttribute('aria-label', paused ? 'Reproduzir ciclo automaticamente' : 'Pausar reprodução automática');
    pause.innerHTML = paused ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  }

  stage.querySelector('.cycle-prev').addEventListener('click', function () { select(current - 1, true); });
  stage.querySelector('.cycle-next').addEventListener('click', function () { next(true); });
  deck.addEventListener('click', function (event) {
    var button = event.target.closest('.cycle-card');
    if (button) select(Number(button.dataset.index), true, button);
  });
  pause.addEventListener('click', function () {
    paused = !paused;
    if (!paused) { focused = false; hovered = false; }
    updatePause();
    schedule();
  });
  stage.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  stage.addEventListener('pointerleave', function () { hovered = false; schedule(); });
  section.addEventListener('focusin', function () { focused = true; schedule(); });
  section.addEventListener('focusout', function (event) { focused = section.contains(event.relatedTarget); schedule(); });
  stage.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); next(true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(current - 1, true); }
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', function () { paused = motion.matches; updatePause(); schedule(); });

  render();
  images.appendChild(picture(slides[0]));
  updatePause();
  grid.before(stage, trackNav);
  grid.hidden = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25;
      schedule();
    }, { threshold: 0.25 }).observe(stage);
  } else { inView = true; schedule(); }
})();
