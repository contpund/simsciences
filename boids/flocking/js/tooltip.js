// One shared tooltip element for every control. Hover (≤200ms) on desktop,
// long-press on touch, with edge-aware positioning that flips and clamps so
// the tooltip is always fully visible. Text is read live from the element's
// data-tip (kept current by i18n), so language switches need no extra work.

const HOVER_DELAY = 150;   // < 200ms requirement
const LONGPRESS_MS = 450;
const MOVE_CANCEL = 10;    // px of touch travel that cancels a long-press
const GAP = 10;

let tip;
let hoverTimer = null;
let pressTimer = null;
let touchStart = null;

function ensureEl() {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  return tip;
}

function show(target) {
  const text = target.getAttribute('data-tip');
  if (!text) return;
  const el = ensureEl();
  el.textContent = text;
  el.hidden = false;
  el.style.visibility = 'hidden';
  position(target, el);
  el.style.visibility = 'visible';
  el.classList.add('visible');
}

function hide() {
  if (!tip) return;
  tip.classList.remove('visible');
  tip.hidden = true;
}

function position(target, el) {
  const r = target.getBoundingClientRect();
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer above; flip below if it would overflow the top.
  let top = r.top - th - GAP;
  if (top < 8) top = r.bottom + GAP;

  // Center horizontally on the control, then clamp into the viewport.
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, vw - tw - 8));
  top = Math.max(8, Math.min(top, vh - th - 8));

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

export function initTooltips() {
  ensureEl();
  const targets = () => document.querySelectorAll('[data-tip], [data-i18n-tip]');

  targets().forEach((t) => {
    // Desktop: delayed hover.
    t.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => show(t), HOVER_DELAY);
    });
    t.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      hide();
    });
    t.addEventListener('focus', () => show(t));
    t.addEventListener('blur', hide);

    // Mobile: long-press, cancelled if the finger moves (i.e. scrolling).
    t.addEventListener('touchstart', (e) => {
      const tp = e.touches[0];
      touchStart = { x: tp.clientX, y: tp.clientY };
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => show(t), LONGPRESS_MS);
    }, { passive: true });

    t.addEventListener('touchmove', (e) => {
      if (!touchStart) return;
      const tp = e.touches[0];
      if (Math.hypot(tp.clientX - touchStart.x, tp.clientY - touchStart.y) > MOVE_CANCEL) {
        clearTimeout(pressTimer);
      }
    }, { passive: true });

    t.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
      setTimeout(hide, 1800);
    });
  });

  // Any scroll/resize invalidates placement.
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
