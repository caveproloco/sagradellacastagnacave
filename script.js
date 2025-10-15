// ===== util =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);

// ===== elementi chiave =====
const header = $('#siteHeader');
const video  = $('#heroVideo');
const burger = $('.burger');
const mobileMenu = $('#mobileMenu');

/* =========================================================================
   HEADER: trasparente SOLO sopra al video (hero), bianco dopo
   ======================================================================== */
(function handleHeaderScroll() {
  if (!header) return;
  const heroEl = document.querySelector('.hero, .hero-content, [data-hero]');

  // Pagine senza hero (es. contatti, gallery): header bianco fisso
  if (!heroEl) {
    header.classList.add('scrolled');
    return;
  }

  const computeRootMargin = () => `-${header.offsetHeight || 80}px 0px 0px 0px`;

  let io;
  const observe = () => {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        // quando la hero NON è più visibile sotto l'header -> header bianco
        header.classList.toggle('scrolled', !e.isIntersecting);
      });
    }, { rootMargin: computeRootMargin(), threshold: 0.01 });
    io.observe(heroEl);
  };

  observe();
  window.addEventListener('resize', observe, { passive: true });
})();

/* =========================================================================
   Smooth scroll con offset header (solo per link ad ancora)
   ======================================================================== */
function smoothScrollTo(selector) {
  const target = document.querySelector(selector);
  if (!target) return;

  const headerH = header?.offsetHeight || 0;
  const rect = target.getBoundingClientRect();
  const absoluteTop = window.pageYOffset + rect.top;

  window.scrollTo({
    top: Math.max(absoluteTop - headerH, 0),
    behavior: 'smooth'
  });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;

  const href = a.getAttribute('href');
  if (!href || href.length <= 1) return; // "#", vuoto, ecc.

  if (document.querySelector(href)) {
    e.preventDefault();
    smoothScrollTo(href);

    // chiudi il menu mobile se aperto
    if (mobileMenu?.classList.contains('open')) {
      mobileMenu.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    }
  }
});

/* =========================================================================
   Burger menu (mobile)
   ======================================================================== */
burger?.addEventListener('click', () => {
  if (!mobileMenu) return;
  const open = mobileMenu.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});

// chiusura menu mobile cliccando un link
mobileMenu?.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    mobileMenu.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  }
});

/* =========================================================================
   Anno nel footer
   ======================================================================== */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();


/* =========================================================================
   Evidenzia la voce di menu in base all'hash (SOLO se c’è un hash)
   ======================================================================== */
(function highlightActiveAnchor(){
  const navLinks = document.querySelectorAll('.mainnav a[href^="#"]');
  if (!navLinks.length) return;

  const setActive = () => {
    const h = location.hash;               // ← nessun default (#storia) all’apertura
    navLinks.forEach(a => {
      const href = a.getAttribute('href');
      const active = h && href === h;      // evidenzia solo se esiste un hash
      a.classList.toggle('active', !!active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  window.addEventListener('hashchange', setActive, { passive:true });
  setActive();
})();

/* =========================================================================
   Countdown alla data di apertura (se presente #countdown)
   ======================================================================== */
const EVENT_START_ISO = '2025-10-24T20:00:00+02:00';
(function initCountdown(){
  const el = document.getElementById('countdown');
  if (!el) return;

  const target = new Date(EVENT_START_ISO).getTime();

  const tick = () => {
    const now = Date.now();
    let diff = Math.max(0, target - now);

    if (diff === 0) {
      el.textContent = 'La Sagra è in corso!';
      return;
    }

    const days = Math.floor(diff / (1000*60*60*24)); diff -= days*1000*60*60*24;
    const hrs  = Math.floor(diff / (1000*60*60));    diff -= hrs *1000*60*60;
    const min  = Math.floor(diff / (1000*60));

    if (days >= 1) {
      el.textContent = `Mancano ${days} ${days === 1 ? 'giorno' : 'giorni'}`;
    } else if (hrs >= 1) {
      el.textContent = `Mancano ${hrs} ${hrs === 1 ? 'ora' : 'ore'} e ${min} ${min === 1 ? 'minuto' : 'minuti'}`;
    } else {
      el.textContent = `Mancano ${min} ${min === 1 ? 'minuto' : 'minuti'}`;
    }
  };

  tick();
  setInterval(tick, 30_000); // aggiorna ogni 30s (basta per minuti/ore/giorni)
})();









/* =========================================================================
   GALLERY Carousel (center mode + infinite loop) — versione FIXED
   ======================================================================== */
(function initCenterCarousel(){
  const root = document.querySelector('[data-carousel]');
  if (!root) return;

  const viewport = root.querySelector('.car-viewport');
  const track = root.querySelector('.car-track');
  const prevBtn = root.querySelector('.car-prev');
  const nextBtn = root.querySelector('.car-next');

  let slides = Array.from(track.children);
  if (slides.length < 2) return;

  // ---- setup: cloni per il loop (gestisce anche gallerie con 2 immagini)
  const headCount = Math.min(3, slides.length);
  const tailCount = Math.min(3, slides.length);
  const clonesHead = slides.slice(0, headCount).map(s => s.cloneNode(true));
  const clonesTail = slides.slice(-tailCount).map(s => s.cloneNode(true));
  clonesHead.forEach(c => track.appendChild(c));
  clonesTail.forEach(c => track.insertBefore(c, track.firstChild));

  slides = Array.from(track.children);
  const originalsCount = slides.length - headCount - tailCount;

  // ---- stato
  const mqMobile = window.matchMedia('(max-width:780px)');
  const slidesPerView = () => (mqMobile.matches ? 1 : 3);

  function getGap(){
    const g = parseFloat(getComputedStyle(track).gap);
    return Number.isFinite(g) ? g : 14; // fallback
  }
  function slideBasis(){
    const vw = viewport.getBoundingClientRect().width;
    const gap = getGap();
    return (vw - gap * (slidesPerView() - 1)) / slidesPerView();
  }

  let index = tailCount; // primo originale
  let isAnimating = false;

  function applyCenterHighlight(i){
    slides.forEach(s => s.classList.remove('is-center'));
    const centerOffset = slidesPerView() === 3 ? 1 : 0;
    const centerSlide = slides[i + centerOffset];
    if (centerSlide) centerSlide.classList.add('is-center');
  }

  function goTo(i, {instant=false} = {}){
    const w = slideBasis() + getGap();
    const x = -i * w;
    track.style.transition = instant ? 'none' : 'transform .35s ease';
    track.style.transform = `translateX(${x}px)`;
    applyCenterHighlight(i);
  }

  // normalizza quando si entra nei cloni (loop)
  function normalize(){
    const firstOriginal = tailCount;
    const lastOriginal  = tailCount + originalsCount - 1;

    if (index < firstOriginal){
      index += originalsCount;
      goTo(index, {instant:true});
    } else if (index > lastOriginal){
      index -= originalsCount;
      goTo(index, {instant:true});
    }
    isAnimating = false;
  }

  // inizializza dopo il load (misure corrette anche senza cache)
  function initPosition(){ goTo(index, {instant:true}); }
  if (document.readyState === 'complete') initPosition();
  else window.addEventListener('load', initPosition);

  track.addEventListener('transitionend', normalize);

  function next(){
    if (isAnimating) return;
    isAnimating = true;
    index += 1; goTo(index);
  }
  function prev(){
    if (isAnimating) return;
    isAnimating = true;
    index -= 1; goTo(index);
  }

  nextBtn?.addEventListener('click', (e)=>{ e.preventDefault(); next(); });
  prevBtn?.addEventListener('click', (e)=>{ e.preventDefault(); prev(); });

  // ---- drag mouse/touch
  let dragging = false, startX = 0, startTX = 0;
  function currentTX(){
    const m = track.style.transform.match(/translateX\((-?\d+(\.\d+)?)px\)/);
    return m ? parseFloat(m[1]) : 0;
  }
  function startDrag(e){
  e.preventDefault(); // evita drag dell’immagine/ghost

    dragging = true; isAnimating = false;
    startX = (e.touches ? e.touches[0].pageX : e.pageX);
    startTX = currentTX();
    track.style.transition = 'none';
  }
  function moveDrag(e){
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].pageX : e.pageX);
    const dx = x - startX;
    track.style.transform = `translateX(${startTX + dx}px)`;
  }
  function endDrag(){
    if (!dragging) return;
    dragging = false;

    const w = slideBasis() + getGap();
    const iFloat = -currentTX() / w;
    index = Math.round(iFloat);
    goTo(index); // partirà transitionend -> normalize
  }

  viewport.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
viewport.addEventListener('touchstart', startDrag, {passive:false});
  window.addEventListener('touchmove', moveDrag, {passive:true});
  window.addEventListener('touchend', endDrag);

  // ---- resize/media query
  mqMobile.addEventListener?.('change', () => goTo(index, {instant:true}));
  window.addEventListener('resize', () => goTo(index, {instant:true}));
})();



// Pulsante 'Torna indietro' con fallback alla home#news
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-back');
  if (!btn) return;
  e.preventDefault();
  if (document.referrer && document.referrer !== location.href) {
    history.back();
  } else {
    location.href = btn.getAttribute('href') || 'Index.html#news';
  }
});


(function initNewsArrows(){
  const wrap = document.querySelector('.fullbleed-news');
  if (!wrap) return;
  const track = wrap.querySelector('.news-track');
  const prev = wrap.querySelector('.news-prev');
  const next = wrap.querySelector('.news-next');
  if (!track || !prev || !next) return;
  const step = () => track.querySelector('.news-card')?.getBoundingClientRect().width || 360;
  prev.addEventListener('click', ()=> track.scrollBy({left: -step()-16, behavior:'smooth'}));
  next.addEventListener('click', ()=> track.scrollBy({left:  step()+16, behavior:'smooth'}));
})();


/* =========================================================================
   Video: avvia solo se è almeno parzialmente visibile; pausa se fuori
   ======================================================================== */
(function () {
  const v = document.getElementById('heroVideo');
  if (!v) return;

  // Non scaricare nulla finché non serve
  v.preload = 'none';
  v.removeAttribute('autoplay'); // sicurezza

  const onView = (entries) => {
    for (const e of entries) {
      const r = e.intersectionRatio || 0;
      if (r > 0) {
        v.play().catch(()=>{});
      } else {
        if (!v.paused) v.pause();
      }
    }
  };

  // threshold 0 = scatta quando passa da 0% a >0% e viceversa
  const io = new IntersectionObserver(onView, { threshold: 0 });
  io.observe(v);

  // Se l’utente torna sulla tab, riparti solo se è in viewport
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const rect = v.getBoundingClientRect();
      const inView =
        rect.bottom > 0 && rect.right > 0 &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left < (window.innerWidth  || document.documentElement.clientWidth);
      if (inView) v.play().catch(()=>{});
    }
  });
})();

