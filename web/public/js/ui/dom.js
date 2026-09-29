// Tiny DOM helpers shared by the UI modules.

export const $ = id => document.getElementById(id);
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export const SCREENS = ['welcome', 'deck', 'galaxy', 'hangar', 'brain', 'codex', 'records', 'settings', 'parent', 'pause', 'debrief', 'draft'];

/** Show exactly one full-screen section (or none with null). */
export function showScreen(name) {
  for (const s of SCREENS) $(`${s}Screen`)?.classList.toggle('hidden', s !== name);
}

let toastTimer = null;
export function toast(text, ms = 2200) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

export function stars(n, max = 3) {
  return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span></span>`;
}

/** Header row with a back button. */
export function head(title, sub = '', right = '') {
  return `<div class="hub-head"><button class="back" data-nav="deck">◂ DECK <kbd>Esc</kbd></button>
    <div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="spacer"></div>${right}</div>`;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}
