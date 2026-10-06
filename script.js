/* ============================================================
   script.js — Sebastian Friedrich Nestler
   Vanilla JS, keine Abhängigkeiten.
   Wird mit <script defer> geladen → blockiert nichts, cached.
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     Helpers
     ========================================================== */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ==========================================================
     SOUND
     ========================================================== */
  let audioCtx = null;
  let soundOn  = false;

  function blip(freq = 660, dur = 0.07, type = 'sine', vol = 0.03) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur + 0.02);
    } catch (_) { /* ignore */ }
  }

  const soundBtn = $('#sound-toggle');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) blip(880, 0.1, 'triangle', 0.045);
    announce(soundOn ? 'UI-Sounds aktiviert' : 'UI-Sounds deaktiviert');
  });

  let liveRegion = null;
  function announce(msg) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = msg; }, 60);
  }

  /* ==========================================================
     THEME ENGINE
     ========================================================== */
  const THEMES = ['dark', 'light', 'synth', 'matrix'];
  const THEME_KEY = 'nestler.theme';

  function setTheme(name, silent) {
    if (!THEMES.includes(name)) return false;
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem(THEME_KEY, name); } catch (_) {}
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) {
      $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg));
    }
    if (!silent) {
      blip(520, 0.08, 'sine', 0.035);
      announce('Farbschema: ' + name);
    }
    return true;
  }

  (function syncInitialTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
    if (!saved) {
      if (cur === 'light') return;
      if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light', true);
    }
  })();

  $('#theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const idx = THEMES.indexOf(cur);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  });

  /* ==========================================================
     MARQUEE
     ========================================================== */
  (function buildMarquee() {
    const items = ['TypeScript', 'React', 'Svelte', 'Astro', 'Node.js', 'Accessibility',
                   'Performance', 'Design Systems', 'PostgreSQL', 'Testing', 'CI/CD', 'UX',
                   'Agentic Videos', 'Avatar-Assistent'];
    const track = $('#marquee');
    if (!track) return;
    const html = items.map(t => `<span>${t}</span>`).join('');
    track.innerHTML = html + html;
  })();

  (function marqueeControl() {
    const wrap = $('#marquee-wrap');
    const btn  = $('#marquee-toggle');
    if (!wrap || !btn) return;

    btn.addEventListener('click', () => {
      const paused = wrap.classList.toggle('paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.textContent = paused ? '▶ Laufband fortsetzen' : '⏸ Laufband anhalten';
      btn.setAttribute('aria-label', paused ? 'Laufband fortsetzen' : 'Laufband anhalten');
      announce(paused ? 'Laufband angehalten' : 'Laufband läuft weiter');
    });
  })();

  /* ==========================================================
     HEADER
     ========================================================== */
  const header = $('#site-header');
  const progress = $('#progress');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('stuck', y > 8);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  const menuToggle = $('#menu-toggle');
  const navLinks = $('#nav-links');
  menuToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    blip(open ? 700 : 500, 0.05);
  });
  navLinks.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ==========================================================
     REVEAL ON SCROLL + SKILL BARS
     ========================================================== */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      obs.unobserve(entry.target);

      if (entry.target.id === 'skill-card') {
        $$('.bar i', entry.target).forEach((bar, i) => {
          const w = bar.getAttribute('data-w');
          setTimeout(() => { bar.style.width = w + '%'; }, reduceMotion ? 0 : i * 110);
        });
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => {
    if (reduceMotion) { el.classList.add('in'); }
    revealObserver.observe(el);
  });
  const skillCard = $('#skill-card');
  if (skillCard && reduceMotion) {
    $$('.bar i', skillCard).forEach(b => { b.style.width = b.getAttribute('data-w') + '%'; });
  }

  /* ==========================================================
     TOOLTIPS — ARIA-Fix
     ========================================================== */
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.id = 'global-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltip);

  let tipTrigger = null;

  function showTip(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;

    tooltip.textContent = text;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.classList.add('visible');
    tipTrigger = el;

    tooltip.style.transform = 'translate(-9999px,-9999px)';
    const r = el.getBoundingClientRect();
    const t = tooltip.getBoundingClientRect();

    let left = r.left + r.width / 2 - t.width / 2;
    let top = r.top - t.height - 11;
    let below = false;

    if (top < 8) { top = r.bottom + 11; below = true; }
    left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8));

    tooltip.classList.toggle('below', below);
    tooltip.style.transform = `translate(${left}px, ${top}px)`;

    if (!el.hasAttribute('aria-describedby')) {
      el.setAttribute('aria-describedby', 'global-tooltip');
    } else if (!el.dataset.tipPrevDesc) {
      el.dataset.tipPrevDesc = el.getAttribute('aria-describedby');
      el.setAttribute('aria-describedby', 'global-tooltip ' + el.dataset.tipPrevDesc);
    }
  }

  function hideTip() {
    tooltip.classList.remove('visible');
    tooltip.style.transform = 'translate(-9999px,-9999px)';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.removeAttribute('role');
    tooltip.textContent = '';

    if (tipTrigger) {
      if (tipTrigger.dataset.tipPrevDesc) {
        tipTrigger.setAttribute('aria-describedby', tipTrigger.dataset.tipPrevDesc);
        delete tipTrigger.dataset.tipPrevDesc;
      } else {
        tipTrigger.removeAttribute('aria-describedby');
      }
    }
    tipTrigger = null;
  }

  function attachTips(root) {
    $$('[data-tip]', root || document).forEach(el => {
      if (el.dataset.tipReady) return;
      el.dataset.tipReady = '1';
      el.addEventListener('mouseenter', () => showTip(el));
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', () => showTip(el));
      el.addEventListener('blur', hideTip);
      el.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
    });
  }
  attachTips();
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ==========================================================
     FOCUS TRAP
     ========================================================== */
  function trapFocus(container, e) {
    const focusables = $$(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      container
    ).filter(el => el.offsetParent !== null || el === document.activeElement);

    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  /* ==========================================================
     YOUTUBE VIDEO FACADE — DSGVO-konform
     ========================================================== */
  (function initVideoFacade() {
    const facade = document.getElementById('agentic-video');
    if (!facade) return;

    const button = facade.querySelector('.video-facade__button');
    const container = facade.querySelector('.video-facade__iframe-container');
    const videoId = 'ZoPidtYYCzw';

    button.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = 'Agentic Videos für Websites — Erklärvideo';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';

      container.innerHTML = '';
      container.appendChild(iframe);
      button.style.display = 'none';

      setTimeout(() => iframe.focus(), 50);
      announce('Video wird geladen');
    });
  })();

  /* ==========================================================
     COMMAND PALETTE
     ========================================================== */
  const paletteOverlay = $('#palette-overlay');
  const paletteInput   = $('#palette-input');
  const paletteList    = $('#palette-list');
  let paletteIndex = 0;
  let lastFocused = null;

  const COMMANDS = [
    { id: 'nav-top',         icon: '◆', label: 'Startseite',            hint: 'G H', run: () => go('#top') },
    { id: 'nav-about',       icon: '👤', label: 'Über mich',             hint: 'G A', run: () => go('#about') },
    { id: 'nav-skills',      icon: '⚡', label: 'Skills & Stack',        hint: 'G S', run: () => go('#skills') },
    { id: 'nav-playground',  icon: '🧪', label: 'Playground öffnen',     hint: 'G P', run: () => go('#playground') },
    { id: 'nav-features',    icon: '✨', label: 'Features',              hint: 'G F', run: () => go('#features') },
    { id: 'nav-ergebnisse',  icon: '💡', label: 'Kein Ballast. Nur Ergebnisse.', hint: 'G E', run: () => go('#ergebnisse') },
    { id: 'nav-preise',      icon: '💶', label: 'Preise & Pakete',       hint: 'G €', run: () => go('#preise') },
    { id: 'nav-avatar',      icon: '🎭', label: 'Digitaler Zwilling & Agentic Videos', hint: 'G V', run: () => go('#avatar') },
    { id: 'nav-faq',         icon: '❓', label: 'FAQ',                   hint: 'G Q', run: () => go('#faq') },
    { id: 'nav-performance', icon: '⚡', label: 'Performance-Nachweis',  hint: 'G L', run: () => go('#performance') },
    { id: 'nav-imprint',     icon: '📄', label: 'Impressum',             hint: 'G I', run: () => go('#imprint') },
    { id: 'nav-privacy',     icon: '🔒', label: 'Datenschutz',           hint: 'G D', run: () => { window.location.href = '/datenschutz.html'; } },
    { id: 'nav-tech',        icon: '⚙️', label: 'Wie diese Seite gebaut wurde', hint: 'G B', run: () => { window.location.href = '/tech-stack.html'; } },
    { id: 'nav-contact',     icon: '✉️', label: 'Kontakt',               hint: 'G C', run: () => go('#contact') },
    { id: 'theme-dark',      icon: '🌑', label: 'Theme: Dark',           hint: '',    run: () => setTheme('dark') },
    { id: 'theme-light',     icon: '☀️', label: 'Theme: Light',          hint: '',    run: () => setTheme('light') },
    { id: 'theme-synth',     icon: '🌸', label: 'Theme: Synthwave',      hint: '',    run: () => setTheme('synth') },
    { id: 'theme-matrix',    icon: '🟢', label: 'Theme: Matrix',         hint: '',    run: () => setTheme('matrix') },
    { id: 'sound',           icon: '🔊', label: 'UI-Sounds umschalten',  hint: '',    run: () => soundBtn.click() },
    { id: 'marquee',         icon: '⏸', label: 'Laufband an/aus',        hint: '',    run: () => $('#marquee-toggle').click() },
    { id: 'cookies',         icon: '🍪', label: 'Cookie-Einstellungen',  hint: '',    run: () => openCookies() },
    { id: 'terminal',        icon: '⌨️', label: 'Terminal fokussieren',  hint: 'G T', run: () => { go('#top'); setTimeout(() => termInput.focus(), 450); } },
    { id: 'matrix-egg',      icon: '🕶️', label: 'Matrix-Regen starten',  hint: '',    run: () => startMatrix() },
    { id: 'duck',            icon: '🦆', label: 'Gummi-Ente rufen',      hint: '',    run: () => { go('#top'); setTimeout(() => termPrint('🦆 Quak! Erzähl mir dein Problem — laut, in kleinen Schritten.', 'ok'), 450); } },
    { id: 'party',           icon: '🎉', label: 'Party-Modus',           hint: '',    run: () => party() },
    { id: 'email',           icon: '📧', label: 'E-Mail kopieren',       hint: '',    run: () => copyEmail() }
  ];

  function go(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    closePalette();
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 500);
  }

  function copyEmail() {
    const mail = 'nestler@nestler.dev';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mail)
        .then(() => announce('E-Mail-Adresse kopiert'))
        .catch(() => fallbackCopy(mail));
    } else {
      fallbackCopy(mail);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); announce('E-Mail-Adresse kopiert'); }
    catch (_) { announce('E-Mail: ' + text); }
    document.body.removeChild(ta);
  }

  function renderPalette(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q))
      : COMMANDS;

    paletteList.innerHTML = '';

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Keine Treffer für „' + query + '“';
      paletteList.appendChild(li);
      paletteInput.removeAttribute('aria-activedescendant');
      return;
    }

    paletteIndex = Math.min(paletteIndex, filtered.length - 1);

    filtered.forEach((cmd, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'cmd-' + cmd.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(i === paletteIndex));
      btn.innerHTML = `<span class="ic" aria-hidden="true">${cmd.icon}</span>
                       <span>${cmd.label}</span>
                       ${cmd.hint ? `<span class="k">${cmd.hint}</span>` : ''}`;

      btn.addEventListener('click', () => { closePalette(); cmd.run(); });
      btn.addEventListener('mousemove', () => {
        paletteIndex = i;
        $$('button', paletteList).forEach((b, j) =>
          b.setAttribute('aria-selected', String(j === i)));
      });

      li.appendChild(btn);
      paletteList.appendChild(li);
    });

    const active = paletteList.querySelectorAll('button')[paletteIndex];
    if (active) paletteInput.setAttribute('aria-activedescendant', active.id);
    else paletteInput.removeAttribute('aria-activedescendant');

    paletteList._filtered = filtered;
  }

  function openPalette() {
    lastFocused = document.activeElement;
    paletteOverlay.hidden = false;
    paletteInput.setAttribute('aria-expanded', 'true');
    paletteIndex = 0;
    paletteInput.value = '';
    renderPalette('');
    setTimeout(() => paletteInput.focus(), 20);
    blip(880, 0.06, 'sine', 0.03);
  }

  function closePalette() {
    paletteOverlay.hidden = true;
    paletteInput.setAttribute('aria-expanded', 'false');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  $('#palette-open').addEventListener('click', openPalette);

  paletteInput.addEventListener('input', () => {
    paletteIndex = 0;
    renderPalette(paletteInput.value);
  });

  paletteInput.addEventListener('keydown', e => {
    const filtered = paletteList._filtered || [];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteIndex = Math.min(paletteIndex + 1, filtered.length - 1);
      renderPalette(paletteInput.value);
      blip(620, 0.03, 'sine', 0.02);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteIndex = Math.max(paletteIndex - 1, 0);
      renderPalette(paletteInput.value);
      blip(580, 0.03, 'sine', 0.02);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[paletteIndex];
      if (cmd) { closePalette(); cmd.run(); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    } else if (e.key === 'Tab') {
      trapFocus(paletteOverlay, e);
    }
  });

  paletteOverlay.addEventListener('mousedown', e => {
    if (e.target === paletteOverlay) closePalette();
  });

  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOverlay.hidden ? openPalette() : closePalette();
    }
    if (e.key === 'Escape') {
      if (!paletteOverlay.hidden) closePalette();
      hideTip();
    }
  });

  /* ==========================================================
     INTERACTIVE TERMINAL
     ========================================================== */
  const termOut   = $('#term-output');
  const termInput = $('#term-input');
  const history   = [];
  let historyIdx  = -1;

  function termPrint(text, cls = 'out') {
    const div = document.createElement('div');
    div.className = 'term-line ' + cls;
    div.textContent = text;
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
  }

  const COMMANDS_TERM = {
    help() {
      termPrint(
`Verfügbare Befehle:
  help              Diese Übersicht
  whoami            Wer ist Sebastian?
  skills            Tech-Stack
  contact           Kontaktwege
  preise            Pakete & Preise
  avatar            Digitaler Zwilling
  videos            Agentic Videos
  perf              PageSpeed-Werte
  theme <name>      dark | light | synth | matrix
  sound <on|off>    UI-Sounds
  matrix            🕶️  Matrix-Regen
  duck              🦆 Gummi-Ente
  sudo              😏
  clear             Terminal leeren
  exit              Terminal ausblenden`, 'out');
    },
    whoami() {
      termPrint('Sebastian Friedrich Nestler — Webentwickler (Frontend & Full-Stack)', 'ok');
      termPrint('Fokus: Performance, Accessibility, Design-Systeme.');
      termPrint('Status: verfügbar ab Q4 2026 für neue Projekte.');
    },
    skills() {
      termPrint('TypeScript · JavaScript · React · Svelte · Astro', 'ok');
      termPrint('Node.js · PostgreSQL · Prisma · Docker · CI/CD');
      termPrint('WCAG 2.2 AA · ARIA · Playwright · Vitest · Vite');
    },
    contact() {
      termPrint('E-Mail: nestler@nestler.dev', 'ok');
      termPrint('Formular: Abschnitt „Kontakt“ weiter unten.');
      termPrint('Antwortzeit: in der Regel < 24 h.');
    },
    preise() {
      termPrint('Pakete:', 'ok');
      termPrint('  Onepager .......... ab 1.995 €  (Lieferung 10–15 Tage)');
      termPrint('  Web-App / Design .. ab 12.000 € (Lieferung 6–12 Wochen)');
      termPrint('  Support / Wartung .. auf Anfrage');
      termPrint('  Avatar / Videos .... auf Anfrage');
      termPrint('→ Details: sebastian-nestler.github.io/#preise');
    },
    avatar() {
      termPrint('Digitaler Zwilling — virtuelle:r Avatar-Assistent:in', 'ok');
      termPrint('  · Look & Stimme: aus Foto + Sprachaufnahme');
      termPrint('  · Wissen: Öffnungszeiten, Anfahrt, Kontakt, Fachfragen');
      termPrint('  · Verfügbar: 24/7 im Web, am Telefon, am Empfang');
      termPrint('  · Integration: Website, Kundenportal, Terminal');
      termPrint('→ Details: sebastian-nestler.github.io/#avatar');
    },
    videos() {
      termPrint('Agentic Videos — Videos aus KI-Agenten', 'ok');
      termPrint('  · Skript eingeben, Video erhalten — in Minuten');
      termPrint('  · Mehrere Sprachen ohne neuen Dreh');
      termPrint('  · Ein Gesicht, viele Botschaften');
      termPrint('  · Ideal für Marketing, Vertrieb, HR, Kundenservice');
      termPrint('→ Details: sebastian-nestler.github.io/#avatar');
    },
    perf() {
      termPrint('PageSpeed Insights — 06.10.2026 (Mobile):', 'ok');
      termPrint('  Leistung ......... 100');
      termPrint('  Barrierefreiheit .. 100');
      termPrint('  Best Practices .... 100');
      termPrint('  SEO ............... 100');
      termPrint('  Agentisches ....... 2/2');
      termPrint('→ Details: sebastian-nestler.github.io/#performance');
    },
    theme(args) {
      const name = (args[0] || '').toLowerCase();
      if (!name) { termPrint('Aktuell: ' + document.documentElement.getAttribute('data-theme'), 'ok'); return; }
      if (setTheme(name)) termPrint('Theme gewechselt → ' + name, 'ok');
      else termPrint('Unbekanntes Theme. Verfügbar: ' + THEMES.join(', '), 'err');
    },
    sound(args) {
      const v = (args[0] || '').toLowerCase();
      if (v === 'on') { if (!soundOn) soundBtn.click(); termPrint('Sounds an.', 'ok'); }
      else if (v === 'off') { if (soundOn) soundBtn.click(); termPrint('Sounds aus.', 'ok'); }
      else termPrint('Nutzung: sound on|off', 'err');
    },
    matrix() {
      termPrint('Wake up, Neo…', 'ok');
      startMatrix();
    },
    duck() {
      termPrint('🦆 Quak! Beschreib mir das Problem, als wäre ich fünf.', 'ok');
    },
    sudo() {
      termPrint('Nice try. 😏  Aber du bist hier schon Root.', 'err');
    },
    coffee() {
      termPrint('☕ Kaffee wird gebrüht… Fertig. Produktivität +200 %.', 'ok');
    },
    clear() {
      termOut.innerHTML = '';
    },
    exit() {
      termPrint('Bis gleich. 👋', 'out');
      termInput.blur();
    }
  };

  function runTermCommand(raw) {
    const input = raw.trim();
    if (!input) return;

    termPrint(input, 'cmd');

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const fn = COMMANDS_TERM[cmd];
    if (typeof fn === 'function') {
      try { fn(args); blip(760, 0.05, 'sine', 0.028); }
      catch (err) { termPrint('Fehler: ' + err.message, 'err'); }
    } else {
      termPrint(`Befehl nicht gefunden: "${cmd}". Tippe "help".`, 'err');
      blip(220, 0.1, 'square', 0.03);
    }
  }

  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = termInput.value;
      if (val.trim()) { history.push(val); historyIdx = history.length; }
      runTermCommand(val);
      termInput.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length) {
        historyIdx = Math.max(0, historyIdx - 1);
        termInput.value = history[historyIdx] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length) {
        historyIdx = Math.min(history.length, historyIdx + 1);
        termInput.value = historyIdx >= history.length ? '' : history[historyIdx];
      }
    }
  });

  termOut.addEventListener('click', () => termInput.focus());
  $('#hero-terminal-focus').addEventListener('click', () => {
    termInput.focus();
    termOut.scrollTop = termOut.scrollHeight;
    blip(700, 0.05);
  });

  /* ==========================================================
     PLAYGROUND
     ========================================================== */
  const DEFAULT_CODE = {
    html: `<div class="card">
  <span class="badge">Live Preview</span>
  <h1>Hallo, Welt 👋</h1>
  <p>Editiere den Code links — die Vorschau aktualisiert sich automatisch.</p>
  <button id="btn">Klick mich</button>
  <p class="out" id="out" aria-live="polite"></p>
</div>`,
    css: `* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #0f0f14, #1b1b28);
  color: #e9e9ec;
  padding: 2rem;
}

.card {
  background: #16161d;
  border: 1px solid #2a2a35;
  border-radius: 18px;
  padding: 2rem;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 24px 60px -20px rgba(0,0,0,.8);
}

.badge {
  display: inline-block;
  font-size: .7rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #4a86ff;
  border: 1px solid #4a86ff55;
  border-radius: 999px;
  padding: .25rem .7rem;
  margin-bottom: 1rem;
}

h1 { margin: 0 0 .6rem; font-size: 1.6rem; letter-spacing: -.02em; }
p  { color: #9a9aa6; line-height: 1.6; margin: 0 0 1.2rem; }

button {
  background: #4a86ff;
  color: #0a0a0b;
  border: 0;
  padding: .7rem 1.4rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .15s ease;
}
button:hover { transform: translateY(-2px); }
button:focus-visible { outline: 3px solid #4a86ff; outline-offset: 3px; }

.out { color: #4a86ff; font-weight: 600; margin-top: 1rem; }`,
    js: `const btn = document.getElementById('btn');
const out = document.getElementById('out');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  out.textContent = \`🎉 \${count} Klick\${count === 1 ? '' : 's'}!\`;
});`
  };

  const codeHtml = $('#code-html');
  const codeCss  = $('#code-css');
  const codeJs   = $('#code-js');
  const preview  = $('#pg-preview');
  const pgStatus = $('#pg-status');

  function loadDefaults() {
    codeHtml.value = DEFAULT_CODE.html;
    codeCss.value  = DEFAULT_CODE.css;
    codeJs.value   = DEFAULT_CODE.js;
  }
  loadDefaults();

  let renderTimer = null;
  function renderPreview() {
    const doc = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${codeCss.value}</style>
</head>
<body>
${codeHtml.value}
<script>
try {
${codeJs.value}
} catch (e) {
  document.body.insertAdjacentHTML('beforeend',
    '<pre style="color:#ff6b6b;font:12px monospace;padding:1rem;white-space:pre-wrap">' +
    String(e) + '</pre>');
}
<\/script>
</body>
</html>`;
    preview.srcdoc = doc;
    pgStatus.textContent = 'Aktualisiert ' + new Date().toLocaleTimeString('de-DE');
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    pgStatus.textContent = 'Tippt…';
    renderTimer = setTimeout(renderPreview, 500);
  }

  [codeHtml, codeCss, codeJs].forEach(ta => {
    ta.addEventListener('input', scheduleRender);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        scheduleRender();
      }
    });
  });

  $('#pg-run').addEventListener('click', () => { renderPreview(); blip(820, 0.06); });
  $('#pg-reset').addEventListener('click', () => {
    loadDefaults(); renderPreview(); announce('Playground zurückgesetzt'); blip(520, 0.08);
  });

  const tabs = $$('.pg-tab');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); selectTab((i - 1 + tabs.length) % tabs.length); tabs[(i - 1 + tabs.length) % tabs.length].focus(); }
    });
  });

  function selectTab(index) {
    tabs.forEach((t, i) => {
      const selected = i === index;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    blip(640, 0.03, 'sine', 0.02);
  }

  renderPreview();

  /* ==========================================================
     LOCAL TIME
     ========================================================== */
  (function localTime() {
    const el = $('#local-time');
    if (!el) return;
    const tz = 'Europe/Berlin';
    function tick() {
      try {
        const now = new Date().toLocaleTimeString('de-DE', {
          timeZone: tz, hour: '2-digit', minute: '2-digit'
        });
        el.textContent = '🕐 ' + now + ' (MEZ/MESZ)';
      } catch (_) {
        el.textContent = '';
      }
    }
    tick();
    setInterval(tick, 30000);
  })();

  /* ==========================================================
     CARD SPOTLIGHT — rAF-throttled, rect-cached
     ========================================================== */
  if (finePointer && !reduceMotion) {
    $$('.card').forEach(card => {
      let rect = null, raf = null, mx = 0, my = 0;

      card.addEventListener('mouseenter', () => {
        rect = card.getBoundingClientRect();
      }, { passive: true });

      card.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          if (rect) {
            card.style.setProperty('--mx', (mx - rect.left) + 'px');
            card.style.setProperty('--my', (my - rect.top) + 'px');
          }
          raf = null;
        });
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        rect = null;
      }, { passive: true });
    });
  }

  /* ==========================================================
     MAGNETIC CURSOR
     ========================================================== */
  if (finePointer && !reduceMotion) {
    const dot  = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    }, { passive: true });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    const HOT = 'a, button, input, textarea, select, [data-tip], summary';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(HOT)) ring.classList.add('hot');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(HOT)) ring.classList.remove('hot');
    });
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1'; ring.style.opacity = '1';
    });
  }

  /* ==========================================================
     MATRIX EASTER EGG
     ========================================================== */
  const matrixCanvas = $('#matrix');
  let matrixRAF = null;
  let matrixStop = null;

  function startMatrix() {
    const ctx = matrixCanvas.getContext('2d');
    if (!ctx) return;

    matrixCanvas.width  = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    matrixCanvas.classList.add('on');

    const fontSize = 15;
    const cols = Math.floor(matrixCanvas.width / fontSize);
    const drops = new Array(cols).fill(1);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/{}[]()=+-*';

    function draw() {
      ctx.fillStyle = 'rgba(0, 6, 0, 0.08)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.fillStyle = '#22ff6b';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      matrixRAF = requestAnimationFrame(draw);
    }

    cancelAnimationFrame(matrixRAF);
    clearTimeout(matrixStop);
    draw();

    matrixStop = setTimeout(stopMatrix, 7000);
  }

  function stopMatrix() {
    cancelAnimationFrame(matrixRAF);
    matrixCanvas.classList.remove('on');
    setTimeout(() => {
      const ctx = matrixCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    }, 420);
  }

  window.addEventListener('resize', () => {
    if (matrixCanvas.classList.contains('on')) {
      matrixCanvas.width  = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
    }
  });

  /* ==========================================================
     PARTY MODE (Konami)
     ========================================================== */
  function party() {
    document.documentElement.classList.add('party');
    announce('🎉 Party-Modus aktiviert');
    blip(1046, 0.12, 'triangle', 0.05);
    setTimeout(() => blip(1318, 0.12, 'triangle', 0.05), 130);
    setTimeout(() => blip(1568, 0.2, 'triangle', 0.05), 260);
    setTimeout(() => {
      document.documentElement.classList.remove('party');
      announce('Party-Modus beendet');
    }, 6000);
  }

  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiPos = 0;
  document.addEventListener('keydown', e => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        party();
        startMatrix();
      }
    } else {
      konamiPos = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  /* ==========================================================
     CONTACT FORM — Formspree (EU-Region)
     ========================================================== */
  const form = $('#contact-form');
  const formStatus = $('#form-status');
  const submitBtn = $('#cf-submit');

  /* Formspree EU:
     - Account/Formular in der Formspree-Verwaltung auf "EU Data Residency" stellen.
     - Endpoint-Format bleibt https://formspree.io/f/{formId}.
     - formId unten durch deine eigene ID ersetzen. */
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xxxxxxxx';

  const validators = {
    name(value) {
      if (!value.trim()) return 'Bitte gib deinen Namen an.';
      if (value.trim().length < 2) return 'Der Name ist etwas zu kurz.';
      return '';
    },
    email(value) {
      if (!value.trim()) return 'Bitte gib deine E-Mail-Adresse an.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!re.test(value.trim())) return 'Das sieht nicht nach einer gültigen E-Mail aus.';
      return '';
    },
    message(value) {
      if (!value.trim()) return 'Bitte schreib mir ein paar Zeilen.';
      if (value.trim().length < 20) return 'Mindestens 20 Zeichen — sonst kann ich nicht viel damit anfangen.';
      return '';
    },
    consent(checked) {
      if (!checked) return 'Ohne deine Zustimmung darf ich die Daten nicht verarbeiten.';
      return '';
    }
  };

  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById('err-' + fieldId.replace('cf-', ''));
    if (!field || !errEl) return;

    if (message) {
      field.setAttribute('aria-invalid', 'true');
      errEl.textContent = message;
    } else {
      field.removeAttribute('aria-invalid');
      errEl.textContent = '';
    }
  }

  function validateField(name) {
    const field = document.getElementById('cf-' + name);
    if (!field) return true;

    let msg = '';
    if (name === 'consent') msg = validators.consent(field.checked);
    else msg = validators[name] ? validators[name](field.value) : '';

    setFieldError('cf-' + name, msg);
    return !msg;
  }

  ['name', 'email', 'message', 'consent'].forEach(name => {
    const field = document.getElementById('cf-' + name);
    if (!field) return;
    field.addEventListener('blur', () => validateField(name));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name);
    });
    field.addEventListener('change', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if ($('#cf-website').value) {
      formStatus.className = 'form-status show ok';
      formStatus.textContent = 'Danke!';
      return;
    }

    const results = ['name', 'email', 'message', 'consent'].map(validateField);
    const allValid = results.every(Boolean);

    if (!allValid) {
      formStatus.className = 'form-status show bad';
      formStatus.textContent = 'Bitte prüfe die markierten Felder.';
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      announce('Formular enthält Fehler');
      blip(220, 0.12, 'square', 0.03);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = '.65';
    formStatus.className = 'form-status show';
    formStatus.textContent = 'Wird gesendet…';

    const payload = {
      name: $('#cf-name').value.trim(),
      email: $('#cf-email').value.trim(),
      subject: $('#cf-subject').value.trim() || 'Neue Anfrage über sebastian-nestler.github.io',
      message: $('#cf-message').value.trim(),
      consent: true
    };

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data && data.errors && data.errors[0] && data.errors[0].message) || ('Server antwortete mit ' + res.status);
        throw new Error(msg);
      }

      formStatus.className = 'form-status show ok';
      formStatus.innerHTML =
        '<strong>Danke, ' + escapeHtml(payload.name.split(' ')[0]) + '!</strong> ' +
        'Deine Nachricht ist angekommen. Ich melde mich innerhalb von 24 Stunden.';
      form.reset();
      announce('Nachricht erfolgreich gesendet');
      blip(880, 0.1, 'triangle', 0.05);
      setTimeout(() => blip(1174, 0.16, 'triangle', 0.05), 120);

    } catch (err) {
      formStatus.className = 'form-status show bad';
      formStatus.innerHTML =
        'Da ist etwas schiefgelaufen. Schreib mir bitte direkt an ' +
        '<a href="mailto:nestler@nestler.dev">nestler@nestler.dev</a>.';
      announce('Senden fehlgeschlagen');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /* ==========================================================
     COOKIE / CONSENT
     ========================================================== */
  const CONSENT_KEY = 'nestler.consent.v1';
  const banner = $('#cookie-banner');
  const prefsBox = $('#cookie-prefs');
  let lastFocusBeforeCookie = null;

  function getConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function saveConsent(obj) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(obj)); } catch (_) {}
    banner.hidden = true;
    if (lastFocusBeforeCookie && lastFocusBeforeCookie.focus) lastFocusBeforeCookie.focus();
    announce('Cookie-Einstellungen gespeichert');
    blip(760, 0.08, 'sine', 0.035);
  }

  function openCookies() {
    lastFocusBeforeCookie = document.activeElement;
    const c = getConsent();
    if (c) {
      $('#pref-stats').checked  = !!c.stats;
      $('#pref-media').checked  = !!c.media;
    }
    banner.hidden = false;
    prefsBox.classList.add('open');
    $('#ck-settings').setAttribute('aria-expanded', 'true');
    setTimeout(() => $('#ck-accept').focus(), 30);
  }

  function initCookies() {
    const consent = getConsent();
    if (consent) {
      banner.hidden = true;
      return;
    }
    setTimeout(() => {
      banner.hidden = false;
      lastFocusBeforeCookie = document.activeElement;
    }, 900);
  }

  $('#ck-accept').addEventListener('click', () => {
    saveConsent({ necessary: true, stats: true, media: true, date: new Date().toISOString() });
  });

  $('#ck-necessary').addEventListener('click', () => {
    saveConsent({ necessary: true, stats: false, media: false, date: new Date().toISOString() });
  });

  $('#ck-settings').addEventListener('click', e => {
    const open = prefsBox.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => $('#pref-stats').focus(), 30);
  });

  $('#ck-save').addEventListener('click', () => {
    saveConsent({
      necessary: true,
      stats: $('#pref-stats').checked,
      media: $('#pref-media').checked,
      date: new Date().toISOString()
    });
  });

  $('#cookie-reopen').addEventListener('click', openCookies);

  banner.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      saveConsent({
        necessary: true, stats: false, media: false,
        date: new Date().toISOString()
      });
    }
  });

  initCookies();

  /* ==========================================================
     MISC
     ========================================================== */
  $('#year').textContent = new Date().getFullYear();

  window.addEventListener('load', () => attachTips());

  (function paletteHint() {
    let seen = false;
    try { seen = localStorage.getItem('nestler.paletteHint') === '1'; } catch (_) {}
    if (seen || reduceMotion) return;
    setTimeout(() => {
      announce('Tipp: Drücke Strg plus K für die Befehlspalette.');
      try { localStorage.setItem('nestler.paletteHint', '1'); } catch (_) {}
    }, 4000);
  })();

})();
