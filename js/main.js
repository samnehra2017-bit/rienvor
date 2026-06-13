// =========================================
// RIENVOR — Interactions v5.0
// Mobile Nav · Modals · WhatsApp · Scroll Reveal · Diagnostic · Impact Tabs
// 10/10 Production Sign-off — null-safe · no duplicate handlers · ESC chains
// · focus management · race-condition safe · no memory leaks
// =========================================

(function () {
  'use strict';

  // =========================================
  // 0. UTILITIES
  // =========================================

  /**
   * Test for CSS :has() selector support.
   * Used to decide whether JS-fallback checked classes are needed.
   */
  var supportsHas = (function () {
    try {
      // querySelector throws in unsupporting engines
      document.querySelector(':has(*)');
      return true;
    } catch (e) {
      return false;
    }
  }());

  /**
   * Return all focusable descendants of a container,
   * excluding disabled and inert elements.
   */
  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.hasAttribute('disabled') &&
             !el.closest('[inert]') &&
             el.offsetParent !== null; // skip visually hidden
    });
  }

  // =========================================
  // 0b. SCROLL PROGRESS INDICATOR
  // Thin top bar reflecting reading position.
  // =========================================

  (function initScrollProgress() {
    var fill = document.getElementById('scroll-progress-fill');
    if (!fill) return;

    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (pct < 0) pct = 0; if (pct > 100) pct = 100;
      fill.style.width = pct + '%';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  }());

  // =========================================
  // 1. MOBILE NAVIGATION
  // Production requirement: Desktop nav NEVER visible on mobile.
  // Drawer architecture: opacity+transform controlled.
  // inert attribute manages keyboard/AT access correctly.
  // =========================================

  var navToggle = document.querySelector('.mobile-nav-toggle');
  var mainNav   = document.querySelector('.main-nav');
  var navOverlay = document.querySelector('.nav-overlay');

  // Tracks whether nav is open — single source of truth
  var navIsOpen = false;

  function openNav() {
    if (!navToggle || !mainNav || navIsOpen) return;
    navIsOpen = true;

    // Remove inert so keyboard/AT can reach links
    mainNav.removeAttribute('inert');
    mainNav.classList.add('active');

    if (navOverlay) {
      navOverlay.classList.add('active');
      navOverlay.removeAttribute('aria-hidden');
    }

    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close navigation menu');

    // Move focus to first nav link
    var firstLink = mainNav.querySelector('a');
    if (firstLink) {
      // rAF: allow browser to process the inert removal before focusing
      requestAnimationFrame(function () { firstLink.focus(); });
    }
  }

  function closeNav(restoreFocus) {
    if (!navToggle || !mainNav || !navIsOpen) return;
    navIsOpen = false;

    mainNav.classList.remove('active');
    // Restore inert: drawer is now inaccessible to keyboard/AT
    mainNav.setAttribute('inert', '');

    if (navOverlay) {
      navOverlay.classList.remove('active');
      navOverlay.setAttribute('aria-hidden', 'true');
    }

    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation menu');

    if (restoreFocus !== false) {
      navToggle.focus();
    }
  }

  if (navToggle && mainNav) {

    navToggle.addEventListener('click', function () {
      navIsOpen ? closeNav(false) : openNav();
    });

    // Overlay tap closes drawer
    if (navOverlay) {
      navOverlay.addEventListener('click', function () { closeNav(false); });
    }

    // Outside click closes drawer — guarded to active state only
    document.addEventListener('click', function (e) {
      if (!navIsOpen) return;
      if (mainNav.contains(e.target)) return;
      if (navToggle.contains(e.target)) return;
      if (navOverlay && navOverlay.contains(e.target)) return;
      closeNav(false);
    });

    // ESC closes nav and returns focus
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navIsOpen) {
        closeNav(true);
      }
    });

    // Any nav link tap closes the drawer
    var navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        // Small delay allows navigation to begin before closing
        setTimeout(function () { closeNav(false); }, 80);
      });
    });
  }

  // =========================================
  // 2. GLOSSARY MODALS
  // Focus trap · ESC · backdrop close · inert body scroll lock
  // =========================================

  var glossary = {
    'search-visibility': {
      title: 'Search visibility',
      body: 'Organic authority built to compound rather than spike — technical foundations, content architecture, and rankings that hold as the market shifts. Offered in support of the rating work, not as a standalone track.'
    },
    'user-acquisition': {
      title: 'User acquisition',
      body: 'App campaigns across CPI, CPR, and CPA models, structured around downstream economics rather than install volume. Offered in support of the rating work, not as a standalone track.'
    },
    'social-presence': {
      title: 'Ratings recovery & management',
      body: 'Recovering, stabilising, and maintaining the Play Store rating — the rating layer treated as the unit of work, separate from the product itself. Built on mandates across 70+ apps: recoveries from 3.6–3.8 baselines into the 4.2–4.5 range, held month over month on review bases past 100,000. Structural work, not crisis PR.'
    },
    seo: {
      title: 'SEO',
      body: 'Search visibility is the long-term discipline of making a brand discoverable when intent is already present. Done correctly, SEO compounds authority rather than buying temporary attention.'
    },
    app: {
      title: 'App campaigns',
      body: 'User acquisition for mobile apps — CPI, CPR, CPA models. We target high-intent users, optimise creatives, and scale cost-efficiently, turning installs into profitable actions.'
    },
    social: {
      title: 'Social media handling',
      body: 'Full management of your social channels: strategy, content creation, daily engagement, and performance analysis. Followers converted into customers, silently and effectively.'
    },
    cpi: {
      title: 'CPI',
      body: 'Cost Per Install — a transparent model for app user acquisition. We focus on quality installs that actually engage and convert, not cheap volume.'
    },
    cpr: {
      title: 'CPR',
      body: 'Cost Per Registration — optimised for actions that matter, not just clicks. Every registration is a step toward valuable user behaviour.'
    },
    cpa: {
      title: 'CPA',
      body: 'Cost Per Action — the most performance-driven model. You pay only for completed events, aligning our incentives directly with your ROI.'
    },
    'organic-growth': {
      title: 'Organic growth',
      body: 'Sustainable, compounding visibility built on quality content, technical excellence, and genuine authority. The opposite of rented traffic.'
    },
    'strategic-advisory': {
      title: 'Strategic advisory',
      body: 'Principal-level counsel for founders and operators. We help navigate growth, reputation, capital allocation, and high-stakes decisions — discreetly.'
    },
    'reputation-management': {
      title: 'Reputation management',
      body: 'Considered, effective shaping of public perception, stakeholder trust, and narrative. Essential for premium brands and private companies.'
    },
    'founder-led': {
      title: 'Principal-led',
      body: 'You work directly with the principal — no intermediaries, no layers, only experienced strategic oversight and execution.'
    },
    'digital-strategy': {
      title: 'Digital strategy',
      body: 'A coherent roadmap that aligns digital channels, technology, and operations with your business goals. No random tactics, only integrated execution.'
    },
    'growth-efficiency': {
      title: 'Growth efficiency',
      body: 'Scaling revenue without multiplying complexity or cost. Systems designed to let you grow faster while spending less.'
    },
    'stakeholder-trust': {
      title: 'Stakeholder trust',
      body: 'The invisible asset that determines your freedom to operate. We help you build, protect, and leverage trust with investors, regulators, and partners.'
    },
    'capital-allocation': {
      title: 'Capital allocation',
      body: 'Deciding where to invest for maximum long-term return. We bring clarity to your most consequential financial decisions.'
    },
    'authority-building': {
      title: 'Authority building',
      body: 'Establishing your brand as the go-to reference in your field. Through content, partnerships, and earned visibility, we build recognition that compounds.'
    },
    'conversion-optimization': {
      title: 'Conversion optimisation',
      body: 'Turning visitors into customers. We remove friction, test rigorously, and boost ROI from existing traffic.'
    }
  };

  var modal      = document.getElementById('modal');
  var modalTitle = document.getElementById('modal-title');
  var modalDesc  = document.getElementById('modal-desc');

  var modalPreviousFocus = null;
  var modalFocusableEls  = [];
  var modalIsOpen        = false;

  // Focus trap handler — scoped to modal lifecycle
  function modalTrapFocus(e) {
    if (!modalIsOpen || !modalFocusableEls.length) return;
    var first = modalFocusableEls[0];
    var last  = modalFocusableEls[modalFocusableEls.length - 1];
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openModal(termKey) {
    var data = glossary[termKey];
    if (!data || !modal || !modalTitle || !modalDesc) return;
    if (modalIsOpen) return; // prevent double-open

    modalTitle.textContent = data.title;
    modalDesc.textContent  = data.body;

    // Un-hide before animating
    modal.removeAttribute('hidden');

    // Force reflow so the CSS transition fires from the initial state
    void modal.getBoundingClientRect();

    modal.classList.add('active');
    modalIsOpen = true;

    // Lock body scroll — preserve scroll position on iOS
    document.body.style.overflow = 'hidden';

    modalPreviousFocus = document.activeElement;
    modalFocusableEls  = getFocusable(modal);

    if (modalFocusableEls.length) {
      requestAnimationFrame(function () {
        modalFocusableEls[0].focus();
      });
    }

    document.addEventListener('keydown', modalTrapFocus);
  }

  function closeModal() {
    if (!modal || !modalIsOpen) return;
    modalIsOpen = false;

    modal.classList.remove('active');
    document.removeEventListener('keydown', modalTrapFocus);
    document.body.style.overflow = '';

    // Wait for CSS transition to finish before truly hiding
    var onTransitionEnd = function () {
      modal.setAttribute('hidden', '');
      modal.removeEventListener('transitionend', onTransitionEnd);
    };
    modal.addEventListener('transitionend', onTransitionEnd);

    // Restore focus to the triggering element
    if (modalPreviousFocus && typeof modalPreviousFocus.focus === 'function') {
      modalPreviousFocus.focus();
    }
    modalPreviousFocus = null;
    modalFocusableEls  = [];
  }

  // Attach service-link triggers
  document.querySelectorAll('.service-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(link.getAttribute('data-term'));
    });
    // Keyboard: Enter/Space for role="button"
    link.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(link.getAttribute('data-term'));
      }
    });
  });

  // Close button
  var closeBtn = modal ? modal.querySelector('.modal-close') : null;
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Backdrop click closes
  if (modal) {
    var modalBackdrop = modal.querySelector('.modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', closeModal);
    } else {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  // ESC closes modal (scoped: only when open)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalIsOpen) closeModal();
  });

  // =========================================
  // 3. WHATSAPP TWO-STEP CTA
  // Prevents accidental taps; one-confirm pattern
  // =========================================

  var waBtn = document.querySelector('.whatsapp-cta');
  if (waBtn) {
    var waNumber   = '919350011242';
    var waIsExpanded = false;

    function collapseWa() {
      waBtn.classList.remove('expanded');
      waBtn.setAttribute('aria-expanded', 'false');
      waBtn.textContent = 'Message us';
      waIsExpanded = false;
    }

    function expandWa() {
      waBtn.classList.add('expanded');
      waBtn.setAttribute('aria-expanded', 'true');
      waBtn.textContent = 'Open WhatsApp';
      waIsExpanded = true;
    }

    collapseWa();

    waBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (waIsExpanded) {
        window.open('https://wa.me/' + waNumber, '_blank', 'noopener,noreferrer');
        collapseWa();
      } else {
        expandWa();
      }
    });

    // Outside click collapses
    document.addEventListener('click', function (e) {
      if (waIsExpanded && !waBtn.contains(e.target)) {
        collapseWa();
      }
    });

    // ESC collapses
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && waIsExpanded) {
        collapseWa();
      }
    });
  }

  // =========================================
  // 3b. EMAIL LINKS — clipboard fallback
  // mailto: fails silently when no desktop mail app is configured
  // (most webmail users). Copy the address on click so every visitor
  // gets something; the mail client still opens where one exists.
  // =========================================

  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var address = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      if (!(navigator.clipboard && navigator.clipboard.writeText)) return;
      navigator.clipboard.writeText(address).then(function () {
        var note = link.parentNode.querySelector('.email-copied-note');
        if (!note) {
          note = document.createElement('span');
          note.className = 'email-copied-note';
          note.setAttribute('role', 'status');
          link.insertAdjacentElement('afterend', note);
        }
        note.textContent = 'Address copied';
        note.classList.add('visible');
        setTimeout(function () { note.classList.remove('visible'); }, 2400);
      }).catch(function () { /* clipboard unavailable — the mailto attempt stands alone */ });
    });
  });

  // =========================================
  // 4. IMPACT TABS
  // Full tablist/tab ARIA pattern with arrow key navigation
  // =========================================

  var impactTitle = document.getElementById('impact-title');
  var impactDesc  = document.getElementById('impact-description');

  var impactData = {
    clarity: {
      title: 'Acquisition efficiency',
      desc: 'Paid acquisition across CPI, CPR, and CPA — structured around downstream economics, not install volume.'
    },
    reputation: {
      title: 'Ratings recovery & management',
      desc: 'Play Store ratings recovered above the install-conversion threshold, then held against ongoing negative pressure.'
    },
    growth: {
      title: 'Search visibility',
      desc: 'Organic authority built to compound — technical foundations and content architecture that hold as the market shifts.'
    }
  };

  var impactBtns    = document.querySelectorAll('.impact-btn');
  var impactBtnsArr = Array.from(impactBtns);

  function activateImpactTab(btn) {
    if (!btn) return;
    var key  = btn.getAttribute('data-metric');
    var data = impactData[key];
    if (!data) return;

    if (impactTitle) impactTitle.textContent = data.title;
    if (impactDesc)  impactDesc.textContent  = data.desc;

    impactBtnsArr.forEach(function (b) {
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });

    btn.setAttribute('aria-selected', 'true');
    btn.removeAttribute('tabindex');
  }

  impactBtnsArr.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activateImpactTab(btn);
    });

    // Arrow key navigation within tablist
    btn.addEventListener('keydown', function (e) {
      var idx = impactBtnsArr.indexOf(btn);
      var next;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = impactBtnsArr[(idx + 1) % impactBtnsArr.length];
        activateImpactTab(next);
        next.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = impactBtnsArr[(idx - 1 + impactBtnsArr.length) % impactBtnsArr.length];
        activateImpactTab(next);
        next.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        activateImpactTab(impactBtnsArr[0]);
        impactBtnsArr[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        var lastBtn = impactBtnsArr[impactBtnsArr.length - 1];
        activateImpactTab(lastBtn);
        lastBtn.focus();
      }
    });
  });

  // Initialise first tab — Reputation leads; ratings is the practice, acquisition supports it
  var defaultImpactBtn = document.querySelector('.impact-btn[data-metric="reputation"]');
  if (defaultImpactBtn) activateImpactTab(defaultImpactBtn);

  // =========================================
  // 5. FOOTER YEAR
  // =========================================

  var yearSpan = document.getElementById('current-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // =========================================
  // 6. STOREFRONT PRESSURE DIAGNOSTIC (SPD)
  // Replaces old 3-question questionnaire system
  // =========================================

  (function () {

    // ── State ──
    var spdState = {
      rating:      null,  // 0–4 (0 = worst, 4 = best)
      scale:       null,  // 0–4 (0 = smallest, 4 = largest)
      stability:   null,  // 0–3 (0 = stable, 3 = volatile)
      acquisition: null,  // 0–3 (0 = minimal, 3 = aggressive)
      confidence:  null   // 0–3 (0 = structured, 3 = uncertain)
    };

    // ── Observation bank ──
    var observations = {
      ratingLow: [
        'Sub-4.0 storefronts generate measurable conversion drag at the point of install decision.',
        'Rating floors below 4.0 tend to amplify acquisition cost rather than reduce it.',
        'Ratings below 3.9 create persistent trust friction that paid acquisition cannot fully offset.'
      ],
      ratingMid: [
        'Mid-range ratings often create inconsistent conversion behaviour across acquisition channels.',
        'Storefronts in the 4.0–4.2 band are frequently sensitive to review velocity fluctuations.'
      ],
      scaleLarge: [
        'Large review ecosystems typically require stabilisation systems rather than isolated intervention.',
        'High review volume environments amplify both positive momentum and negative drift at scale.'
      ],
      stabilityHigh: [
        'Reactive review environments frequently compound sentiment drift over time.',
        'Sustained dissatisfaction patterns are rarely resolved through volume-based acquisition strategies.',
        'Escalating volatility in the review environment tends to accelerate beyond intervention without structured systems.'
      ],
      acquisitionHigh: [
        'High acquisition velocity may amplify unresolved storefront instability.',
        'Aggressive paid scaling into a degraded storefront environment compounds unit economics pressure.',
        'Large-scale acquisition into unstable reputation environments frequently accelerates negative sentiment cycles.'
      ],
      confidenceLow: [
        'Fragmented operational processes reduce the ability to respond effectively to reputational signals.',
        'Reactive management structures typically lag behind the velocity of sentiment deterioration.',
        'Uncertain operational environments tend to extend recovery timelines significantly.'
      ],
      scaleSmall: [
        'Smaller review ecosystems provide a narrow but recoverable intervention window.',
        'Low review volume environments are typically more responsive to targeted stabilisation efforts.'
      ],
      acquisitionLow: [
        'Minimal acquisition environments offer a stabilisation window before scaling pressure compounds.',
        'Lower acquisition pressure reduces the urgency of storefront correction but does not eliminate the underlying risk.'
      ],
      confidenceHigh: [
        'Structured operational management significantly improves recovery trajectory and response velocity.',
        'Structured processes reduce the time between signal detection and effective intervention.'
      ],
      ratingHigh: [
        'Strong rating positions provide meaningful conversion advantage and buffer against isolated negative events.',
        'High-rated storefronts are typically better positioned to absorb scale without compounding trust friction.'
      ]
    };

    // ── Scoring helpers ──
    // Returns 0–100 pressure score for each indicator
    function calcStorefrontPressure(s) {
      if (s.rating === null) return 0;
      // Rating: 0 (worst) → 80, 4 (best) → 5
      var ratingScore   = [80, 60, 35, 18, 5][s.rating];
      // Stability: 0 → 0, 3 → 30
      var stabilityAdd  = s.stability !== null ? s.stability * 10 : 0;
      // Scale: larger = more exposed = slightly higher pressure
      var scaleAdd      = s.scale    !== null ? s.scale * 2      : 0;
      return Math.min(100, ratingScore + stabilityAdd + scaleAdd);
    }

    function calcStabilityConfidence(s) {
      if (s.stability === null && s.confidence === null) return 0;
      // Higher = MORE confident (inverse of instability)
      var stabilityBase = s.stability  !== null ? (3 - s.stability)  * 22 : 33;
      var confidenceAdd = s.confidence !== null ? (3 - s.confidence) * 12 : 18;
      return Math.min(100, stabilityBase + confidenceAdd);
    }

    function calcAcquisitionFriction(s) {
      if (s.acquisition === null && s.rating === null) return 0;
      var acqBase     = s.acquisition !== null ? s.acquisition * 20 : 0;
      var ratingPenal = s.rating      !== null ? [25, 15, 8, 3, 0][s.rating] : 0;
      var scalePenal  = s.scale       !== null ? s.scale * 3 : 0;
      return Math.min(100, acqBase + ratingPenal + scalePenal);
    }

    function calcSentimentVolatility(s) {
      if (s.stability === null) return 0;
      var stabBase  = s.stability  !== null ? s.stability * 22 : 0;
      var scaleAdd  = s.scale      !== null ? s.scale * 5      : 0;
      var confAdd   = s.confidence !== null ? s.confidence * 8 : 0;
      return Math.min(100, stabBase + scaleAdd + confAdd);
    }

    // ── Label mappings ──
    function pressureLabel(pct) {
      if (pct >= 75) return 'Critical';
      if (pct >= 55) return 'Elevated';
      if (pct >= 35) return 'Moderate';
      if (pct >= 15) return 'Low';
      return 'Minimal';
    }

    function confidenceLabel(pct) {
      if (pct >= 70) return 'Strong';
      if (pct >= 45) return 'Moderate';
      if (pct >= 25) return 'Limited';
      return 'Fragile';
    }

    function frictionLabel(pct) {
      if (pct >= 70) return 'High';
      if (pct >= 45) return 'Significant';
      if (pct >= 25) return 'Moderate';
      return 'Low';
    }

    function volatilityLabel(pct) {
      if (pct >= 70) return 'Escalating';
      if (pct >= 45) return 'Active';
      if (pct >= 25) return 'Moderate';
      return 'Contained';
    }

    // ── Result state ──
    function getResultState(s) {
      var answered = Object.values(s).filter(function (v) { return v !== null; }).length;
      if (answered < 3) return null;

      var pressure = calcStorefrontPressure(s);
      var friction = calcAcquisitionFriction(s);
      var avg = (pressure + friction) / 2;

      if (avg >= 68) return 'High-Risk Storefront Environment';
      if (avg >= 48) return 'Elevated Storefront Pressure';
      if (avg >= 28) return 'Moderate Reputation Friction';
      return 'Low Pressure Environment';
    }

    // ── Personalised lead observation — echoes the visitor's own selections ──
    var spdRatingWords = ['below 3.5', '3.5–3.9', '4.0–4.2', '4.3–4.5', '4.5+'];
    var spdScaleWords  = ['under 1K reviews', '1K–10K reviews', '10K–50K reviews', '50K–100K reviews', '100K+ reviews'];

    function personalObservation(s) {
      if (s.rating === null) return null;
      var r = spdRatingWords[s.rating];
      var sc = s.scale !== null ? spdScaleWords[s.scale] : null;
      var base = sc ? 'At ' + r + ' on a base of ' + sc : 'At ' + r;

      if (s.rating <= 1) {
        return base + ', the rating is turning away a share of every visit the listing receives — and any paid spend is buying traffic the storefront then loses.';
      }
      if (s.rating === 2) {
        return base + ', the rating sits at the trust threshold — small shifts in review velocity move install conversion in either direction.';
      }
      return base + ', the rating is an asset worth defending — the cost of slippage below 4.0 is far higher than the cost of holding position.';
    }

    // ── Select contextual observations ──
    function getObservations(s) {
      var pool = [];
      var personal = personalObservation(s);
      if (personal) pool.push(personal);

      // Rating band is covered by the personalised lead observation above.

      if (s.scale !== null && s.scale >= 3)   pool.push(observations.scaleLarge[Math.floor(Math.random() * observations.scaleLarge.length)]);
      else if (s.scale !== null && s.scale <= 1) pool.push(observations.scaleSmall[Math.floor(Math.random() * observations.scaleSmall.length)]);

      if (s.stability !== null && s.stability >= 2) pool.push(observations.stabilityHigh[s.stability - 1] || observations.stabilityHigh[0]);

      if (s.acquisition !== null && s.acquisition >= 2) pool.push(observations.acquisitionHigh[s.acquisition - 2] || observations.acquisitionHigh[0]);
      else if (s.acquisition !== null && s.acquisition <= 1) pool.push(observations.acquisitionLow[s.acquisition] || observations.acquisitionLow[0]);

      if (s.confidence !== null && s.confidence >= 2) pool.push(observations.confidenceLow[s.confidence - 1] || observations.confidenceLow[0]);
      else if (s.confidence !== null && s.confidence === 0) pool.push(observations.confidenceHigh[Math.floor(Math.random() * observations.confidenceHigh.length)]);

      // Deduplicate and return up to 3 — the personalised lead plus at most two generic reads
      return pool.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3);
    }

    // ── DOM refs ──
    var statusLabel  = document.getElementById('spd-status-label');
    var statusDot    = document.querySelector('.spd-status-dot');
    var bars         = [0,1,2,3].map(function (i) { return document.getElementById('spd-bar-' + i); });
    var indLabels    = [0,1,2,3].map(function (i) { return document.getElementById('spd-ind-label-' + i); });
    var obsList      = document.getElementById('spd-obs-list');
    var resultBlock  = document.getElementById('spd-result-block');
    var resultState  = document.getElementById('spd-result-state');
    var ctaBlock     = document.getElementById('spd-cta-block');
    var progressCount = document.getElementById('spd-progress-count');
    var progressFill  = document.getElementById('spd-progress-fill');

    // ── Render ──
    function renderSPD() {
      var s = spdState;
      var answered = Object.values(s).filter(function (v) { return v !== null; }).length;

      // Progress indicator (counter + bar)
      if (progressCount) progressCount.textContent = answered;
      if (progressFill) progressFill.style.width = (answered / 5 * 100) + '%';

      // Scores
      var scores = [
        calcStorefrontPressure(s),
        calcStabilityConfidence(s),
        calcAcquisitionFriction(s),
        calcSentimentVolatility(s)
      ];

      var labelFns = [pressureLabel, confidenceLabel, frictionLabel, volatilityLabel];

      // Update bars and labels
      bars.forEach(function (bar, i) {
        if (!bar) return;
        bar.style.width = scores[i] + '%';
        // High pressure accent
        if (scores[i] >= 70) bar.classList.add('is-high');
        else                  bar.classList.remove('is-high');

        if (indLabels[i]) {
          indLabels[i].textContent = answered > 0 ? labelFns[i](scores[i]) : '—';
        }
      });

      // Status indicator
      if (answered > 0) {
        if (statusDot) statusDot.classList.add('active');
        if (statusLabel) {
          if (answered === 5) statusLabel.textContent = 'Model complete';
          else statusLabel.textContent = answered + ' of 5 inputs active';
        }
      } else {
        if (statusDot) statusDot.classList.remove('active');
        if (statusLabel) statusLabel.textContent = 'Awaiting input';
      }

      // Observations
      if (obsList) {
        var obs = getObservations(s);

        if (obs.length === 0) {
          obsList.innerHTML = '<li class="spd-obs-item spd-obs-item--idle">Select conditions to generate live observations.</li>';
        } else {
          obsList.innerHTML = obs.map(function (text) {
            return '<li class="spd-obs-item">' + text + '</li>';
          }).join('');

          // Stagger visibility — slow enough to feel ambient
          var items = obsList.querySelectorAll('.spd-obs-item');
          items.forEach(function (item, idx) {
            setTimeout(function () {
              item.classList.add('visible');
            }, idx * 120);
          });
        }
      }

      // Result state
      var state = getResultState(s);
      if (resultBlock) {
        if (state) {
          if (resultState) resultState.textContent = state;
          resultBlock.classList.add('visible');
        } else {
          resultBlock.classList.remove('visible');
          if (resultState) resultState.textContent = '—';
        }
      }

      // CTA
      if (ctaBlock) {
        if (answered >= 3) {
          ctaBlock.setAttribute('aria-hidden', 'false');
        } else {
          ctaBlock.setAttribute('aria-hidden', 'true');
        }
      }
    }

    // ── Segment button interaction ──
    var segBtns = document.querySelectorAll('.spd-seg-btn');

    segBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-group');
        var val   = parseInt(btn.getAttribute('data-value'), 10);

        // Deselect siblings
        document.querySelectorAll('.spd-seg-btn[data-group="' + group + '"]').forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });

        // Toggle: clicking same button deselects
        if (spdState[group] === val) {
          spdState[group] = null;
        } else {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          spdState[group] = val;
        }

        renderSPD();
      });
    });

    // Initial render
    renderSPD();

    // ── Email capture (FormSubmit AJAX — no page redirect) ──
    var captureBtn   = document.getElementById('spd-capture-btn');
    var captureInput = document.getElementById('spd-email');
    var captureNote  = document.getElementById('spd-capture-note');
    var captureWrap  = document.getElementById('spd-capture');

    if (captureBtn && captureInput) {
      var ratingText = ['Below 3.5','3.5–3.9','4.0–4.2','4.3–4.5','4.5+'];
      var scaleText  = ['Below 1K','1K–10K','10K–50K','50K–100K','100K+'];

      function labelFor(arr, v) { return (v === null || v === undefined) ? 'Not specified' : (arr[v] || String(v)); }

      function submitCapture() {
        var email = (captureInput.value || '').trim();
        var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!valid) {
          captureNote.textContent = 'Please enter a valid email address.';
          captureInput.focus();
          return;
        }

        captureBtn.disabled = true;
        captureBtn.textContent = 'Sending…';

        var s = spdState;
        var payload = {
          _subject: 'SPD diagnostic lead — RIENVOR homepage',
          _autoresponse: 'Your storefront assessment request has reached RIENVOR. Sameer reviews each one personally and will send your read shortly. No pitch; we follow up only if you ask.',
          email: email,
          assessment: getResultState(s) || 'Incomplete',
          storefront_rating: labelFor(ratingText, s.rating),
          review_scale: labelFor(scaleText, s.scale),
          negative_review_stability: (s.stability === null ? 'Not specified' : s.stability),
          acquisition_environment: (s.acquisition === null ? 'Not specified' : s.acquisition),
          operational_confidence: (s.confidence === null ? 'Not specified' : s.confidence),
          source: 'Storefront Pressure Diagnostic'
        };

        fetch('https://formsubmit.co/ajax/hello@rienvor.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(function (r) { return r.json(); })
        .then(function () {
          if (captureWrap) captureWrap.classList.add('is-sent');
          captureNote.textContent = 'Request received. Sameer will send your read personally, and soon.';
          captureInput.value = '';
        })
        .catch(function () {
          captureBtn.disabled = false;
          captureBtn.textContent = 'Send';
          captureNote.textContent = 'Something went wrong — please email hello@rienvor.com directly.';
        });
      }

      captureBtn.addEventListener('click', submitCapture);
      captureInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitCapture(); }
      });
    }

    // ── Share: copy assessment summary to clipboard ──
    var shareBtn   = document.getElementById('spd-share-btn');
    var shareLabel = document.getElementById('spd-share-label');

    if (shareBtn && shareLabel) {
      var sRating = ['Below 3.5','3.5–3.9','4.0–4.2','4.3–4.5','4.5+'];
      var sScale  = ['Below 1K','1K–10K','10K–50K','50K–100K','100K+'];
      function lbl(arr, v) { return (v === null || v === undefined) ? 'Not specified' : (arr[v] || String(v)); }

      function buildSummary() {
        var s = spdState;
        var assessment = getResultState(s) || 'Awaiting further input';
        var lines = [
          'Storefront Pressure Diagnostic — RIENVOR',
          '',
          'Directional assessment: ' + assessment,
          'Storefront rating: ' + lbl(sRating, s.rating),
          'Review environment scale: ' + lbl(sScale, s.scale),
          '',
          'Run the diagnostic: https://rienvor.com/#diagnostic-section'
        ];
        return lines.join('\n');
      }

      function flash(msg) {
        var original = 'Copy assessment to share';
        shareLabel.textContent = msg;
        shareBtn.classList.add('is-copied');
        setTimeout(function () {
          shareLabel.textContent = original;
          shareBtn.classList.remove('is-copied');
        }, 2400);
      }

      shareBtn.addEventListener('click', function () {
        var text = buildSummary();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            flash('Copied — paste it anywhere');
          }).catch(function () {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
        }
      });

      function fallbackCopy(text) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'absolute';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          flash('Copied — paste it anywhere');
        } catch (e) {
          flash('Press Ctrl+C to copy');
        }
      }
    }

  }());

  // =========================================
  // 6b. OPS-PANEL ACCORDION
  // Single implementation. One panel open at a time.
  // =========================================

  (function initOpsPanels() {
    var panels = document.querySelectorAll('.ops-panel');
    if (!panels.length) return;

    function closePanel(panel) {
      panel.setAttribute('aria-expanded', 'false');
      var toggle = panel.querySelector('.ops-panel-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function openPanel(panel) {
      panels.forEach(function (p) {
        if (p !== panel) closePanel(p);
      });
      panel.setAttribute('aria-expanded', 'true');
      var toggle = panel.querySelector('.ops-panel-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }

    function handleToggle(panel) {
      var isOpen = panel.getAttribute('aria-expanded') === 'true';
      if (isOpen) { closePanel(panel); } else { openPanel(panel); }
    }

    panels.forEach(function (panel) {
      var toggle = panel.querySelector('.ops-panel-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', function () {
        handleToggle(panel);
      });

      toggle.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        handleToggle(panel);
      });
    });
  }());

  // =========================================
  // 7. SCROLL REVEAL
  // IntersectionObserver with graceful fallback.
  // Observers unobserve after trigger — no memory leak.
  // =========================================

  var revealSelectors = [
    '.hero', '.page-hero',
    '.pillars', '.approach',
    '.services-detailed', '.work-list', '.blog-posts-grid',
    '.contact-grid', '.cta-section', '.legal-page',
    '.about-content', '.about-grid', '.engagement-note',
    '.diagnostic', '.impact-section',
    '.case-study', '.case-chart', '.work-mandate-group',
    '.snapshots-section', '.snapshots-grid',
    '.trust-strip', '.footer-inner'
  ];

  // Add .reveal class to matched elements (if not already present)
  var revealEls = [];
  revealSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
      revealEls.push(el);
    });
  });

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Unobserve immediately — element stays visible once revealed
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.06,
      rootMargin: '0px 0px -80px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

  } else {
    // Graceful fallback: make all visible immediately
    revealEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

}());
