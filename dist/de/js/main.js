/* ===================================================
   AlsysLife — Premium JavaScript
   =================================================== */

'use strict';

/* ── Molecule Network Canvas ───────────────────── */
class MoleculeNetwork {
  constructor(id) {
    this.canvas = document.getElementById(id);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.COUNT = 75;
    this.MAX_DIST = 145;
    this._raf = null;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    this.resize();
    this.build();
    window.addEventListener('resize', this.resize);
    this.tick();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  build() {
    this.particles = Array.from({ length: this.COUNT }, () => ({
      x:  Math.random() * this.canvas.width,
      y:  Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r:  Math.random() * 2.2 + 0.8,
      op: Math.random() * 0.45 + 0.2,
    }));
  }

  tick() {
    const { ctx, canvas, particles, MAX_DIST } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > canvas.width)  { p.x = canvas.width;  p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }
    }

    // edges — white on teal hero
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.18;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes — white glow
    for (const p of particles) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5);
      g.addColorStop(0, `rgba(255,255,255,${p.op * 0.25})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.op * 0.75})`;
      ctx.fill();
    }

    this._raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.resize);
  }
}

/* ── Navbar ────────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('navMenu');
  if (!navbar) return;

  const hasHero = !!document.getElementById('heroCanvas');

  const onScroll = () => {
    if (hasHero) {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }
  };

  // Inner pages: always show white nav from load
  if (!hasHero) {
    navbar.classList.add('scrolled');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Active link
  const page = location.pathname.split('/').pop() || 'index.html';
  navbar.querySelectorAll('.nav-link[href]').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

/* ── Scroll Reveal ─────────────────────────────── */
function initReveal() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );
  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
          .forEach(el => io.observe(el));
}

/* ── Counter Animation ─────────────────────────── */
function animateCount(el, target, ms = 1800) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / ms, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target, parseInt(e.target.dataset.target, 10));
        io.unobserve(e.target);
      }
    }),
    { threshold: 0.5 }
  );
  document.querySelectorAll('[data-target]').forEach(el => io.observe(el));
}

/* ── Contact Form ──────────────────────────────── */
function initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn  = form.querySelector('[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = 'Message Sent ✓';
      btn.style.background = 'linear-gradient(135deg,#2d6e2d,#3fa83f)';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
        form.reset();
      }, 3200);
    }, 1400);
  });
}

/* ── Counterfeit Disclaimer Modal ──────────────── */
function shouldShowDisclaimer() {
  let isReload = false;
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    isReload = nav ? nav.type === 'reload' : performance.navigation.type === 1;
  } catch (err) { /* Navigation Timing unsupported — fall through */ }

  if (isReload) return true;

  try {
    if (sessionStorage.getItem('disclaimerShown')) return false;
  } catch (err) { /* sessionStorage unavailable — show every time */ }

  return true;
}

function markDisclaimerShown() {
  try { sessionStorage.setItem('disclaimerShown', '1'); } catch (err) { /* ignore */ }
}

const DISCLAIMER_DEFAULTS = {
  title: 'Beware of Counterfeit Sellers',
  body:  'Alfurin is sold exclusively on this website. Third-party sites copying our name and packaging are not authorized and may sell unsafe imitations.',
  chips: ['Official Source', 'No Resellers', 'Avoid Imitations'],
  note:  'Only trust product information found on this site.',
  btn:   'Got It',
  close: 'Close',
};

function initDisclaimer() {
  if (!shouldShowDisclaimer()) return;
  markDisclaimerShown();

  const d = Object.assign({}, DISCLAIMER_DEFAULTS, window.__DISCLAIMER__ || {});

  const overlay = document.createElement('div');
  overlay.className = 'disclaimer-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'disclaimerTitle');

  const chipsHtml = d.chips.map(c => `<li class="disclaimer-chip">${c}</li>`).join('');

  overlay.innerHTML = `
    <div class="disclaimer-modal">
      <button type="button" class="disclaimer-close" aria-label="${d.close}">&times;</button>
      <div class="disclaimer-head">
        <div class="disclaimer-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        </div>
        <h2 id="disclaimerTitle">${d.title}</h2>
      </div>
      <p>${d.body}</p>
      <ul class="disclaimer-chips">${chipsHtml}</ul>
      <p class="disclaimer-footer-note">${d.note}</p>
      <div class="disclaimer-actions">
        <button type="button" class="btn btn-primary disclaimer-ack">${d.btn}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 320);
  };

  overlay.querySelector('.disclaimer-close').addEventListener('click', close);
  overlay.querySelector('.disclaimer-ack').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });

  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  });
}

/* ── Smooth Anchor Scroll ──────────────────────── */
function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ── Init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initReveal();
  initCounters();
  initForm();
  initAnchors();
  initDisclaimer();

  if (document.getElementById('heroCanvas')) {
    new MoleculeNetwork('heroCanvas');
  }
});
