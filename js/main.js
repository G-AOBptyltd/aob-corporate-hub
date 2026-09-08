/* ============================================
   AOB Corporate Hub — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ---- Navbar scroll effect ----
  const nav = document.querySelector('.nav');
  if (nav) {
    // Pages that hardcode `class="nav scrolled"` (subpages with no dark hero)
    // want a solid nav at all times — only the transparent-at-top pages (e.g. the
    // homepage over its dark hero) should toggle on scroll. Without this, the
    // on-load call stripped `scrolled` and left white nav text on a white page.
    const alwaysSolid = nav.classList.contains('scrolled');
    const onScroll = () => {
      if (alwaysSolid) { nav.classList.add('scrolled'); return; }
      nav.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- Mobile nav toggle ----
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // ---- "Our Products" slide-out drawer ----
  // Turns the "Our Products" nav item into a right-side drawer listing every
  // product home page plus the sales portal. Built once here so a single JS +
  // CSS change lights it up on every page (the nav is duplicated across pages).
  (() => {
    // Internal links resolve relative to whether we're at the site root or in /pages/.
    const inPages = window.location.pathname.includes('/pages/');
    const base = inPages ? '' : 'pages/';

    const products = [
      { name: 'SprintINSite',    desc: 'Predictive sprint analytics',        url: 'https://sprintinsite.com' },
      { name: 'PortfolioInSite', desc: 'AI-native portfolio governance',     url: 'https://portfolioinsite.com.au' },
      { name: 'ForecastInSite',  desc: 'Delivery forecasting, no Jira',       url: 'https://portfolioinsite.com.au/tools/forecastinsite' },
      { name: 'PlanInSite',      desc: 'PI planning workspace',              url: 'https://portfolioinsite.com.au/tools/planinsite' },
      { name: 'FlowInSite',      desc: 'Flow metrics & cycle time',          url: 'https://sprintinsite.com/tools/flowinsite' },
      { name: 'ReportInSite',    desc: 'Jira board reporting & scorecards',   url: 'https://reportinsite.com.au' },
      { name: 'CareerInSite',    desc: 'Career-relevance scoring & AI coaching', url: 'https://careerinsite.com.au' },
      { name: 'SurveyInSite',    desc: 'Team health & engagement surveys',   url: 'https://surveyinsite.com.au' },
      { name: 'InSite Academy',   desc: 'Applied AI training & advisory',     url: 'https://insiteacademy.com.au' }
    ];

    const triggers = Array.from(document.querySelectorAll('.nav-links a'))
      .filter(a => a.textContent.trim() === 'Our Products');
    if (!triggers.length) return;

    // Build the drawer + backdrop once.
    const backdrop = document.createElement('div');
    backdrop.className = 'products-drawer-backdrop';

    const drawer = document.createElement('aside');
    drawer.className = 'products-drawer';
    drawer.id = 'products-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Our Products');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="products-drawer-head">
        <span class="products-drawer-eyebrow">Our Products</span>
        <button type="button" class="products-drawer-close" aria-label="Close products menu">&times;</button>
      </div>
      <nav class="products-drawer-list" aria-label="Products">
        ${products.map(p => `
          <a href="${p.url}" target="_blank" rel="noopener">
            <span class="pd-name">${p.name}</span>
            <span class="pd-desc">${p.desc}</span>
            <span class="pd-arrow" aria-hidden="true">&rarr;</span>
          </a>`).join('')}
      </nav>
      <div class="products-drawer-foot">
        <a href="${base}pricing.html" class="products-drawer-cta">
          <span class="pd-name">Sales portal</span>
          <span class="pd-desc">Pricing, plans &amp; purchase</span>
          <span class="pd-arrow" aria-hidden="true">&rarr;</span>
        </a>
        <a href="${base}brands.html" class="products-drawer-all">View all products &rarr;</a>
      </div>`;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    const openDrawer = () => {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('drawer-open');
      triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
      // Collapse the mobile nav if it was open.
      if (navLinks) navLinks.classList.remove('open');
      drawer.querySelector('.products-drawer-close').focus();
    };
    const closeDrawer = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('drawer-open');
      triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    };

    triggers.forEach(trigger => {
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'products-drawer');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', e => {
        e.preventDefault();
        openDrawer();
      });
    });

    backdrop.addEventListener('click', closeDrawer);
    drawer.querySelector('.products-drawer-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  })();

  // ---- Scroll-triggered reveal animations ----
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // ---- Active nav link ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- Netlify form handling with AJAX ----
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const origText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      const formData = new FormData(contactForm);

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      })
      .then(response => {
        if (response.ok) {
          btn.textContent = 'Message Sent!';
          btn.style.background = '#10b981';
          contactForm.reset();
          setTimeout(() => {
            btn.textContent = origText;
            btn.style.background = '';
            btn.disabled = false;
          }, 4000);
        } else {
          throw new Error('Form submission failed');
        }
      })
      .catch(error => {
        btn.textContent = 'Error — please try again';
        btn.style.background = '#ef4444';
        btn.disabled = false;
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.background = '';
        }, 4000);
      });
    });
  }

  // ---- Counter animation for stats ----
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.floor(target * eased).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
});
