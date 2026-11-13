// ════════════════════════════════════════════════════════════════
//  CINEMA ART — the sleeper in pod 07·114, as vector art.
//  World units: 1600 × 900 (the side shot). The same SVG is rasterised
//  whole for the dolly shot and cropped (viewBox) at higher resolution
//  for the face and eye close-ups. Dynamic parts (frost, hand, monitor,
//  breath, lights) are drawn on the canvas by cinema.js.
// ════════════════════════════════════════════════════════════════

import { esc } from '../core/util.js';

/** Glass canopy outline, shared with the canvas (frost is clipped to it). */
export const CANOPY = 'M190 522C190 388 262 334 404 326L1214 326C1356 334 1420 392 1420 522Z';
/** Where the hand sits (canvas draws it) and the face (frost melts from here). */
export const HAND = { x: 772, y: 461 };
export const FACE = { x: 344, y: 424 };
export const EYE = { x: 338, y: 431 };
export const MOUTH = { x: 376, y: 417 };
export const PANEL = { x: 990, y: 560, w: 236, h: 70 };

// Profile of the sleeper, lying on their back, face up, head on the left.
// Top contour runs crown → forehead → nose → lips → chin → neck.
const HEAD = `M258 482
  C255 458 266 436 286 426
  C298 420 310 417 322 416
  C328 416 332 420 335 422
  C339 420 343 416 348 410
  C352 404 356 399 362 398
  C368 397 372 403 371 409
  C370 413 366 415 362 415
  C366 414 369 413 371 414
  C373 415 374 417 375 418
  C377 416 380 415 382 417
  C383 419 383 421 384 422
  C389 420 394 418 398 420
  C404 423 407 430 405 438
  C402 447 398 452 398 456
  L432 470 L434 524
  L300 524
  C278 520 262 506 258 482Z`;

const HAIR = `M298 423
  C286 425 270 432 262 446
  C254 462 254 486 262 502
  C268 514 282 522 300 524
  L338 524
  C324 516 312 508 306 496
  C303 486 307 476 304 466
  C300 456 304 446 306 436
  C304 430 302 426 298 423Z`;

export function podSVG(name = '') {
  const pilot = name ? esc(name.toUpperCase()) : '▒▒▒▒▒▒';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
<defs>
  <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a3554"/><stop offset=".18" stop-color="#262240"/><stop offset=".7" stop-color="#15122a"/><stop offset="1" stop-color="#0b0918"/>
  </linearGradient>
  <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9a27c"/><stop offset=".3" stop-color="#c48660"/><stop offset=".7" stop-color="#9a603f"/><stop offset="1" stop-color="#5e3826"/>
  </linearGradient>
  <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a2e3a"/><stop offset=".5" stop-color="#1f222c"/><stop offset="1" stop-color="#121318"/>
  </linearGradient>
  <linearGradient id="foil" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e9e6f2"/><stop offset=".25" stop-color="#b9b4cc"/><stop offset=".6" stop-color="#7b7593"/><stop offset="1" stop-color="#3b3652"/>
  </linearGradient>
  <linearGradient id="foilSheen" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#ffe9d6" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".7" stop-color="#ffe0c8" stop-opacity=".35"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6a5a4a"/><stop offset=".5" stop-color="#4a3e33"/><stop offset="1" stop-color="#2e2620"/>
  </linearGradient>
  <linearGradient id="bed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2b2a4a"/><stop offset="1" stop-color="#121027"/>
  </linearGradient>
  <linearGradient id="pillow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9d3e8"/><stop offset=".6" stop-color="#8e88a8"/><stop offset="1" stop-color="#3e3958"/>
  </linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfd9f0" stop-opacity=".16"/><stop offset=".6" stop-color="#9aa6d6" stop-opacity=".06"/><stop offset="1" stop-color="#6d5fa8" stop-opacity=".12"/>
  </linearGradient>
  <linearGradient id="streak" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="inner" cx=".22" cy=".7" r=".75">
    <stop offset="0" stop-color="#e8a87c" stop-opacity=".35"/><stop offset=".5" stop-color="#8b2252" stop-opacity=".12"/><stop offset="1" stop-color="#0a0020" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="cheek" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#d27a66" stop-opacity=".35"/><stop offset="1" stop-color="#d27a66" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="blur8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  <clipPath id="headClip"><path d="${HEAD}"/></clipPath>
  <clipPath id="canopyClip"><path d="${CANOPY}"/></clipPath>
</defs>

<!-- floor shadow + pedestal -->
<ellipse cx="800" cy="742" rx="700" ry="40" fill="url(#shadow)"/>
<path d="M420 668 L1180 668 L1130 742 L470 742 Z" fill="#0d0b1c"/>
<path d="M470 742 L1130 742" stroke="#e8a87c" stroke-opacity=".25" stroke-width="2"/>
<!-- hoses -->
<path d="M150 600 C90 610 70 700 40 760" stroke="#1d1a33" stroke-width="16" fill="none" stroke-linecap="round"/>
<path d="M150 600 C90 610 70 700 40 760" stroke="#e8a87c" stroke-opacity=".18" stroke-width="2" fill="none"/>
<path d="M1458 610 C1520 630 1540 700 1580 770" stroke="#1d1a33" stroke-width="18" fill="none" stroke-linecap="round"/>

<!-- interior: back wall of the pod, warm inner light -->
<path d="${CANOPY}" fill="#0c0a1e"/>
<path d="${CANOPY}" fill="url(#inner)"/>

<!-- bed + pillow -->
<rect x="196" y="508" width="1212" height="20" rx="8" fill="url(#bed)"/>
<path d="M200 509 L1404 509" stroke="#d4e5f7" stroke-opacity=".12" stroke-width="1.5"/>
<path d="M226 524 C220 500 236 488 268 486 L432 490 C458 494 466 506 460 524 Z" fill="url(#pillow)"/>
<path d="M240 498 C300 494 380 494 446 500" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/>

<!-- ═══ THE SLEEPER ═══ -->
<!-- head: skin with depth shading -->
<path d="${HEAD}" fill="url(#skin)"/>
<g clip-path="url(#headClip)">
  <ellipse cx="300" cy="500" rx="80" ry="40" fill="#3a2018" opacity=".45" filter="url(#blur8)"/>
  <ellipse cx="350" cy="452" rx="24" ry="13" fill="url(#cheek)"/>
  <!-- jaw shadow and neck shading -->
  <path d="M398 456 C390 468 380 476 366 482 L434 490 L434 470 Z" fill="#5a3426" opacity=".55" filter="url(#soft)"/>
  <path d="M300 524 C340 512 390 506 434 510 L434 524 Z" fill="#3c2219" opacity=".7" filter="url(#soft)"/>
  <!-- eye socket -->
  <ellipse cx="337" cy="433" rx="12" ry="6" fill="#7a4a38" opacity=".55" filter="url(#soft)"/>
</g>
<!-- ear -->
<path d="M306 470 C300 462 308 452 318 456 C330 460 332 476 326 488 C322 496 312 496 308 488" fill="#a86e54" stroke="#6e4232" stroke-width="1.4"/>
<path d="M312 468 C316 462 324 466 324 474 C324 482 318 486 314 482" fill="none" stroke="#6e4232" stroke-width="1.6" stroke-linecap="round"/>
<!-- hair -->
<path d="${HAIR}" fill="url(#hair)"/>
<g stroke="#3a4152" stroke-opacity=".9" stroke-width="1.4" fill="none" stroke-linecap="round">
  <path d="M296 426 C282 432 270 442 264 458"/><path d="M300 432 C286 440 274 452 268 470"/>
  <path d="M302 446 C290 456 280 470 276 490"/><path d="M304 462 C294 476 288 492 290 508"/>
  <path d="M292 424 C278 428 266 438 260 452"/>
</g>
<g fill="#e9f2ff" opacity=".55">
  <circle cx="266" cy="446" r="1.3"/><circle cx="259" cy="468" r="1.1"/><circle cx="274" cy="436" r="1.2"/><circle cx="262" cy="490" r="1"/>
</g>
<!-- eyebrow -->
<path d="M317 428.5 C325 423.5 334 423 342 426.5" stroke="#1a1416" stroke-width="3.8" fill="none" stroke-linecap="round"/>
<path d="M321 426.6 C327 424 333 423.8 338 425" stroke="#4a3226" stroke-width=".8" fill="none" stroke-linecap="round"/>
<!-- closed eye: crease, lid, lashes -->
<path d="M329 428.5 C334 427 341 427.5 346 430" stroke="#6b3e2e" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>
<path d="M328 431.5 C334 435.5 341 435.5 347 432.5" fill="#b77a60" stroke="none"/>
<path d="M328 431.5 C334 435.5 341 435.5 347 432.5" stroke="#1a100c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<g stroke="#1a100c" stroke-width=".6" stroke-linecap="round">
  <path d="M331 433.6 l1.2 2.6"/><path d="M334 434.6 l1.3 2.8"/><path d="M337 435 l1.4 2.9"/><path d="M340 434.8 l1.5 2.7"/><path d="M343 434 l1.6 2.4"/><path d="M345.5 433 l1.6 2"/>
</g>
<!-- nose detail, lips -->
<path d="M360.5 411.6 C362 413.2 364 413.2 365.6 412.2" stroke="#6b3e2e" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path d="M370.5 414.5 C373 416 375 417.5 377 418" stroke="#7a3a32" stroke-width="1.2" fill="none" stroke-linecap="round"/>
<path d="M371.5 414.6 C373.5 415.4 374.6 416.6 375 418 L372 418.6 Z" fill="#a85e50" opacity=".45"/>
<!-- beard: neat line-up along the jaw, full at the chin, soft top edge -->
<linearGradient id="beardG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1a1c" stop-opacity=".5"/><stop offset=".3" stop-color="#1e1a1c"/><stop offset="1" stop-color="#1e1a1c"/></linearGradient>
<path d="M317 464 C330 461 346 452 359 440 C367 432 373 426 377 421 L384 424 C389 421 394 419 398 421 C404 424 407 431 405 439 C402 448 398 453 398 457 C390 466 372 474 352 480 C338 484 326 482 319 476 Z" fill="url(#beardG)"/>
<path d="M362 415.5 C366 414 369 413.5 371 414.5 L371.5 416.4 C368 416 365 416.4 362.5 417.4 Z" fill="#1e1a1c"/>
<g stroke="#8a8a90" stroke-width=".9" stroke-linecap="round" opacity=".6"><path d="M392 440 l2 3"/><path d="M384 452 l2 3"/><path d="M402 432 l3 1"/></g>
<!-- glasses (matte black, gold hinge): the lens seen side-on, the arm back to the ear -->
<path d="M326 419.5 L350 414.5" stroke="#121214" stroke-width="3.6" stroke-linecap="round"/>
<path d="M327 420 C323 434 320 448 317 461" stroke="#121214" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<rect x="324.5" y="418.5" width="4.2" height="2.4" rx="1" fill="#c9a44c"/>
<path d="M326 419.5 L350 414.5" stroke="#3a3e48" stroke-width="1.2" stroke-linecap="round"/>
<path d="M331 416.4 L346 413.4" stroke="#ffe6d0" stroke-opacity=".55" stroke-width="1" stroke-linecap="round"/>
<!-- rim light along the profile (warm overhead light) -->
<path d="M262 446 C270 432 286 424 300 420 M300 420 C312 417 320 416 326 417 C330 418 333 421 335 422 C339 420 343 416 348 410 C353 403 357 398 361 397 C365 397 368 404 367 409 M371 414 C373 415 374 417 375 418 C377 416 380 415 382 417 M384 422 C389 420 394 418 398 420 C404 423 407 430 405 438"
  stroke="#ffd9b8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85" filter="url(#glow)"/>

<!-- neck ring of the cryo suit -->
<path d="M424 462 L450 456 L452 524 L426 524 Z" fill="#7c7f86"/>
<path d="M424 462 L450 456 L452 524 L426 524 Z" fill="none" stroke="#9a9da4" stroke-width="1.4"/>
<path d="M440 460 L442 522" stroke="#3fd1ff" stroke-width="2" stroke-opacity=".8" filter="url(#glow)"/>
<!-- suit at the chest -->
<path d="M450 456 C462 452 474 452 486 454 L486 524 L452 524 Z" fill="url(#suit)"/>

<!-- thermal blanket -->
<path d="M470 524 L470 460 C500 448 530 438 566 434 C620 430 660 438 704 444 C750 450 790 456 830 454
  C880 450 920 440 960 438 C1010 436 1050 430 1086 432 C1126 434 1160 446 1198 448
  C1226 450 1244 440 1258 424 C1268 414 1282 414 1290 426 C1300 440 1306 460 1310 480 L1314 524 Z" fill="url(#foil)"/>
<path d="M470 524 L470 460 C500 448 530 438 566 434 C620 430 660 438 704 444 C750 450 790 456 830 454
  C880 450 920 440 960 438 C1010 436 1050 430 1086 432 C1126 434 1160 446 1198 448
  C1226 450 1244 440 1258 424 C1268 414 1282 414 1290 426 C1300 440 1306 460 1310 480 L1314 524 Z" fill="url(#foilSheen)"/>
<g stroke="#4b4566" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round">
  <path d="M520 470 C560 480 600 500 620 522"/><path d="M700 456 C720 476 760 496 790 520"/>
  <path d="M880 462 C900 480 930 500 950 522"/><path d="M1040 446 C1060 470 1090 496 1110 520"/>
  <path d="M1170 460 C1190 480 1210 500 1230 522"/><path d="M1262 440 C1270 470 1280 500 1286 522"/>
</g>
<g stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round">
  <path d="M500 452 C530 442 560 436 600 434"/><path d="M880 448 C920 440 960 436 1000 436"/><path d="M1240 434 C1252 424 1266 416 1278 418"/>
</g>
<!-- blanket hem -->
<path d="M470 460 C500 448 530 438 566 434" stroke="#e8a87c" stroke-opacity=".5" stroke-width="2" fill="none"/>

<!-- near arm, resting on the blanket (the hand is drawn live) -->
<path d="M478 458 C540 456 600 458 642 462 C690 458 735 452 768 450 L770 472 C734 476 690 482 642 486 C600 484 540 488 480 488 Z" fill="url(#suit)"/>
<path d="M484 466 C560 464 620 468 644 470 C700 466 740 460 766 458" stroke="#241e19" stroke-opacity=".9" stroke-width="1.6" fill="none"/>
<path d="M642 462 C650 470 650 480 642 486" stroke="#06201f" stroke-opacity=".6" stroke-width="1.5" fill="none"/>
<rect x="752" y="449" width="16" height="24" rx="4" fill="#20263a"/>
<rect x="752" y="449" width="16" height="24" rx="4" fill="none" stroke="#c9a44c" stroke-width="1.2"/>

<!-- canopy glass (frost is drawn live on top) -->
<path d="${CANOPY}" fill="url(#glass)"/>
<g clip-path="url(#canopyClip)">
  <path d="M300 300 L360 300 L250 540 L190 540 Z" fill="url(#streak)" opacity=".55"/>
  <path d="M1000 300 L1030 300 L920 540 L890 540 Z" fill="url(#streak)" opacity=".6"/>
</g>
<path d="M190 522C190 388 262 334 404 326L1214 326C1356 334 1420 392 1420 522" fill="none" stroke="#e7e2f5" stroke-opacity=".35" stroke-width="2.5"/>
<path d="M204 512C206 396 270 346 406 340L1212 340" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.5"/>

<!-- shell -->
<path d="M146 520 L1464 520 C1474 520 1474 532 1470 542 L1442 642 C1434 664 1420 668 1400 668 L210 668 C190 668 176 664 168 642 L140 542 C136 532 136 520 146 520 Z" fill="url(#shell)"/>
<path d="M150 522 L1460 522" stroke="#e8a87c" stroke-width="3" opacity=".75" filter="url(#glow)"/>
<path d="M176 600 L1434 600" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
<path d="M176 602 L1434 602" stroke="#fff" stroke-opacity=".05" stroke-width="1"/>
<!-- vents -->
<g stroke="#0a0818" stroke-width="4" stroke-linecap="round">
  <path d="M640 576 L700 576"/><path d="M640 588 L700 588"/><path d="M720 576 L780 576"/><path d="M720 588 L780 588"/>
</g>
<!-- name plate -->
<rect x="292" y="560" width="276" height="62" rx="8" fill="#0b0918" stroke="#e8a87c" stroke-opacity=".45"/>
<text x="308" y="584" font-family="Space Grotesk, Segoe UI, sans-serif" font-size="14" letter-spacing="3" fill="#e8a87c" fill-opacity=".8">POD 07·114 · INTERCEPTOR</text>
<text x="308" y="608" font-family="Space Grotesk, Segoe UI, sans-serif" font-weight="700" font-size="17" letter-spacing="3" fill="#f6e6dc">PILOT: ${pilot}</text>
<!-- monitor panel (the screen content is drawn live) -->
<rect x="${PANEL.x - 6}" y="${PANEL.y - 6}" width="${PANEL.w + 12}" height="${PANEL.h + 12}" rx="10" fill="#0b0918" stroke="#e8a87c" stroke-opacity=".35"/>
<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="5" fill="#120a24"/>
</svg>`;
}

// ════════════════════════════════════════════════════════════════
//  FRONT VIEW — the pilot's face, from the canonical character portrait
//  (512 × 512). eyes: 'open' | 'closed'.
//  bg: 'space' (the portrait's own round frame, for the HUD and the suit-up
//  shot) · 'pillow' (seen from above through the pod glass) · 'none'.
// ════════════════════════════════════════════════════════════════
const FACE_PATH = 'M256 126 C334 126 372 182 372 252 C372 324 338 380 256 394 C174 380 140 324 140 252 C140 182 178 126 256 126 Z';
/** Where the left eye sits in the front view (for the eye close-up). */
export const FRONT_EYE = { x: 198, y: 246 };
export const FRONT_MOUTH = { x: 256, y: 334 };
export const FRONT_LENS = { x: 152, y: 216, w: 94, h: 66 };

export function faceFrontSVG({ eyes = 'open', bg = 'space' } = {}) {
  const closed = eyes === 'closed';
  const background = bg === 'space' ? `
  <circle cx="256" cy="256" r="248" fill="url(#space)"/>
  <g clip-path="url(#frame)">
    <g fill="#E8F1FF">
      <circle cx="70" cy="110" r="1.6"/><circle cx="110" cy="60" r="1"/><circle cx="420" cy="90" r="1.8"/>
      <circle cx="455" cy="170" r="1.1"/><circle cx="60" cy="210" r="1.2"/><circle cx="440" cy="300" r="1.4"/>
      <circle cx="90" cy="320" r="1"/><circle cx="380" cy="50" r="1.1"/><circle cx="160" cy="40" r="1.3"/>
    </g>
    <circle cx="256" cy="256" r="228" fill="none" stroke="#3FD1FF" stroke-opacity="0.18" stroke-width="1.5"/>
    <path d="M60 180 A212 212 0 0 1 150 72" fill="none" stroke="#3FD1FF" stroke-width="4" stroke-linecap="round" stroke-opacity="0.7"/>
    <path d="M452 332 A212 212 0 0 1 400 410" fill="none" stroke="#3FD1FF" stroke-width="4" stroke-linecap="round" stroke-opacity="0.7"/>
    <g fill="#3FD1FF" fill-opacity="0.7">
      <rect x="440" y="196" width="10" height="3" rx="1.5"/><rect x="444" y="206" width="6" height="3" rx="1.5"/>
      <rect x="440" y="216" width="10" height="3" rx="1.5"/>
    </g>` : bg === 'pillow' ? `
  <rect x="0" y="0" width="512" height="512" fill="#141026"/>
  <ellipse cx="256" cy="200" rx="250" ry="190" fill="url(#pillowTop)"/>
  <g><path d="M30 120 C120 96 200 110 260 104 C330 98 420 112 490 140" stroke="#fff" stroke-opacity=".08" stroke-width="3" fill="none"/>
  <path d="M40 250 C110 236 160 250 170 262" stroke="#000" stroke-opacity=".18" stroke-width="4" fill="none"/>
  <path d="M472 250 C410 236 360 250 342 262" stroke="#000" stroke-opacity=".18" stroke-width="4" fill="none"/></g>
  <g>` : '<g>';
  const suitClip = bg === 'space' ? '' : '';
  const eyesSVG = closed ? `
  <!-- Eyes closed: lids, lash lines, a soft crease above -->
  <path d="M174 246 C186 236 210 236 222 246 C210 252 186 252 174 246 Z" fill="#a8693f"/>
  <path d="M290 246 C302 236 326 236 338 246 C326 252 302 252 290 246 Z" fill="#9a603f"/>
  <path d="M176 240 C188 231 208 231 220 240" fill="none" stroke="#7a4a33" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  <path d="M292 240 C304 231 324 231 336 240" fill="none" stroke="#6e422d" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  <path d="M174 246 C186 253 210 253 222 246" fill="none" stroke="#1A1416" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M290 246 C302 253 326 253 338 246" fill="none" stroke="#1A1416" stroke-width="2.6" stroke-linecap="round"/>
  <g stroke="#1A1416" stroke-width="1.3" stroke-linecap="round">
    <path d="M180 249 l-2 4"/><path d="M187 251 l-1 4.5"/><path d="M194 252 l-.4 4.6"/><path d="M201 252 l.4 4.6"/><path d="M208 251 l1 4.4"/><path d="M215 249 l2 4"/>
    <path d="M297 249 l-2 4"/><path d="M304 251 l-1 4.5"/><path d="M311 252 l-.4 4.6"/><path d="M318 252 l.4 4.6"/><path d="M325 251 l1 4.4"/><path d="M332 249 l2 4"/>
  </g>` : `
  <!-- Eyes -->
  <path d="M174 246 C186 232 210 232 222 246 C210 256 186 256 174 246 Z" fill="#F2EBE4"/>
  <path d="M290 246 C302 232 326 232 338 246 C326 256 302 256 290 246 Z" fill="#F2EBE4"/>
  <circle cx="198" cy="245" r="9" fill="#3B2416"/><circle cx="314" cy="245" r="9" fill="#3B2416"/>
  <circle cx="198" cy="245" r="4.5" fill="#0E0A08"/><circle cx="314" cy="245" r="4.5" fill="#0E0A08"/>
  <circle cx="201.5" cy="241.5" r="2.2" fill="#FFFFFF"/><circle cx="317.5" cy="241.5" r="2.2" fill="#FFFFFF"/>
  <circle cx="195" cy="248.5" r="1" fill="#3FD1FF" opacity="0.8"/><circle cx="311" cy="248.5" r="1" fill="#3FD1FF" opacity="0.8"/>
  <path d="M174 246 C186 232 210 232 222 246" fill="none" stroke="#1A1416" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M290 246 C302 232 326 232 338 246" fill="none" stroke="#1A1416" stroke-width="2.5" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="space" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#22306A"/><stop offset="0.6" stop-color="#121A3D"/><stop offset="1" stop-color="#090D20"/></radialGradient>
    <radialGradient id="pillowTop" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#cfc8e0"/><stop offset=".7" stop-color="#8e88a8"/><stop offset="1" stop-color="#3e3958" stop-opacity="0"/></radialGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#B07048"/><stop offset="0.45" stop-color="#C48660"/><stop offset="1" stop-color="#9A603F"/></linearGradient>
    <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F222C"/><stop offset="1" stop-color="#121318"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15161C"/><stop offset="1" stop-color="#15161C" stop-opacity="0.35"/></linearGradient>
    <linearGradient id="beardTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1A1C" stop-opacity="0.55"/><stop offset="0.25" stop-color="#1E1A1C"/><stop offset="1" stop-color="#1E1A1C"/></linearGradient>
    <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4B3D"/><stop offset="1" stop-color="#2E2620"/></linearGradient>
    <linearGradient id="lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FD3FF" stop-opacity="0.16"/><stop offset="1" stop-color="#B48CFF" stop-opacity="0.06"/></linearGradient>
    <clipPath id="frame"><circle cx="256" cy="256" r="248"/></clipPath>
    <clipPath id="faceClip"><path d="${FACE_PATH}"/></clipPath>
  </defs>
  ${background}
    <!-- Neck -->
    <path d="M198 348 L198 440 L314 440 L314 348 Z" fill="#9A603F"/>
    <path d="M198 360 C230 392 282 392 314 360 L314 380 C282 404 230 404 198 380 Z" fill="#86533A" opacity="0.5"/>
    <!-- Techwear flight suit: high collar, panel seams, light strip -->
    <path d="M36 512 C48 448 112 416 186 404 C210 420 302 420 326 404 C400 416 464 448 476 512 Z" fill="url(#suit)"/>
    <path d="M178 398 C200 430 312 430 334 398 L340 424 C312 452 200 452 172 424 Z" fill="#7C7F86"/>
    <path d="M178 398 C200 430 312 430 334 398" fill="none" stroke="#9A9DA4" stroke-width="2"/>
    <path d="M190 440 C222 456 290 456 322 440" fill="none" stroke="#3FD1FF" stroke-width="3" stroke-linecap="round"/>
    <path d="M120 440 L150 512 M392 440 L362 512" stroke="#241E19" stroke-width="3"/>
    <rect x="356" y="462" width="44" height="22" rx="6" fill="#20263A" stroke="#C9A44C" stroke-width="2"/>
    <path d="M366 478 L374 466 L382 478 Z" fill="#3FD1FF"/>
    <rect x="386" y="469" width="8" height="3" rx="1.5" fill="#C9A44C"/>
  </g>
  <!-- Ears -->
  <ellipse cx="141" cy="258" rx="17" ry="29" fill="#B07048"/>
  <ellipse cx="371" cy="258" rx="17" ry="29" fill="#9A603F"/>
  <path d="M136 246 C130 256 132 270 140 276" fill="none" stroke="#86533A" stroke-width="3" stroke-linecap="round"/>
  <path d="M376 246 C382 256 380 270 372 276" fill="none" stroke="#86533A" stroke-width="3" stroke-linecap="round"/>
  <!-- Face -->
  <path d="${FACE_PATH}" fill="url(#skin)"/>
  <g clip-path="url(#faceClip)">
    <path d="M330 140 C376 190 380 300 330 380 L400 400 L400 120 Z" fill="#86533A" opacity="0.28"/>
    <ellipse cx="204" cy="290" rx="28" ry="16" fill="#D9A27C" opacity="0.35"/>
    <ellipse cx="248" cy="182" rx="52" ry="14" fill="#D9A27C" opacity="0.4"/>
  </g>
  <!-- Beard -->
  <path d="M146 256 C146 334 186 404 256 410 C326 404 366 334 366 256 L358 264 C356 302 340 324 322 336 C308 346 296 352 286 352 C272 346 240 346 226 352 C216 352 204 346 190 336 C172 324 156 302 154 264 Z" fill="url(#beardTop)"/>
  <path d="M226 352 C238 360 274 360 286 352 C282 364 270 370 256 370 C242 370 230 364 226 352 Z" fill="#1E1A1C"/>
  <path d="M154 264 C156 302 172 324 190 336" fill="none" stroke="#2C2629" stroke-width="2" opacity="0.8"/>
  <path d="M358 264 C356 302 340 324 322 336" fill="none" stroke="#2C2629" stroke-width="2" opacity="0.8"/>
  <g stroke="#8A8A90" stroke-width="1.6" stroke-linecap="round" opacity="0.75">
    <path d="M232 384 l3 6"/><path d="M262 392 l-2 6"/><path d="M286 380 l3 5"/>
    <path d="M318 360 l4 4"/><path d="M196 362 l-4 5"/><path d="M248 374 l1 6"/>
  </g>
  <path transform="translate(0,11)" d="M222 312 C236 303 248 305 256 308 C264 305 276 303 290 312 C278 310 266 312 256 314 C246 312 234 310 222 312 Z" fill="#2A2426"/>
  <!-- Hair: textured volume on top, faded sides -->
  <path d="M146 250 C138 214 138 186 146 166 L170 170 C160 196 156 222 154 248 Z" fill="url(#fade)"/>
  <path d="M366 250 C374 214 374 186 366 166 L342 170 C352 196 356 222 358 248 Z" fill="url(#fade)"/>
  <path d="M146 176 C140 140 160 108 196 94 C214 76 252 70 278 78 C306 70 336 84 348 102 C372 116 382 146 372 180 C356 164 334 156 312 156 C292 148 266 146 246 152 C222 146 196 152 178 164 C166 168 154 172 146 176 Z" fill="url(#hair)"/>
  <g fill="none" stroke="#3A4152" stroke-width="3.5" stroke-linecap="round">
    <path d="M176 126 C192 108 214 104 232 112"/><path d="M236 94 C254 84 276 86 292 96"/><path d="M298 106 C318 102 338 114 350 132"/>
    <path d="M198 144 C214 132 234 130 250 138"/><path d="M264 124 C284 116 304 120 320 134"/>
  </g>
  <path d="M236 94 C254 84 276 86 292 96" fill="none" stroke="#3FD1FF" stroke-width="2" stroke-opacity="0.35" stroke-linecap="round"/>
  <!-- Eyebrows -->
  <path d="M168 214 C184 202 210 199 233 207 L231 215 C210 210 188 212 170 220 Z" fill="#1A1416"/>
  <path d="M344 214 C328 202 302 199 279 207 L281 215 C302 210 324 212 342 220 Z" fill="#1A1416"/>
  ${eyesSVG}
  <!-- Nose -->
  <g transform="translate(0,6)">
    <path d="M264 222 C266 246 272 266 280 282 C274 284 268 280 264 272 C262 256 262 238 264 222 Z" fill="#86533A" opacity="0.35"/>
    <path d="M253 230 C252 248 252 264 253 276" fill="none" stroke="#D9A27C" stroke-width="5" stroke-linecap="round" opacity="0.45"/>
    <path d="M216 300 C218 284 234 276 256 276 C278 276 294 284 296 300 C292 312 276 316 256 316 C236 316 220 312 216 300 Z" fill="#9A603F" opacity="0.28"/>
    <path d="M242 284 C228 282 218 290 219 300 C221 308 232 311 242 306 Z" fill="#B57650"/>
    <path d="M270 284 C284 282 294 290 293 300 C291 308 280 311 270 306 Z" fill="#A2663F"/>
    <path d="M240 294 C238 280 246 272 256 272 C266 272 274 280 272 294 C270 304 262 308 256 308 C250 308 242 304 240 294 Z" fill="#C2835C"/>
    <ellipse cx="252" cy="285" rx="7" ry="6" fill="#E0AA84" opacity="0.6"/>
    <circle cx="250" cy="283" r="1.8" fill="#F3C9A6" opacity="0.75"/>
    <path d="M241 285 C231 286 224 293 225 302" fill="none" stroke="#7A4A33" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <path d="M271 285 C281 286 288 293 287 302" fill="none" stroke="#6E422D" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <path d="M236 304 C238 299 245 298 249 303 C246 307 239 308 236 304 Z" fill="#3E2216"/>
    <path d="M276 304 C274 299 267 298 263 303 C266 307 273 308 276 304 Z" fill="#3E2216"/>
    <path d="M249 305 C252 308 260 308 263 305" fill="none" stroke="#7A4A33" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <path d="M221 304 C226 310 233 311 238 309 M274 309 C279 311 286 310 291 304" fill="none" stroke="#6E422D" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  </g>
  <!-- Mouth -->
  <g transform="translate(0,10)">
    <path d="M228 322 C240 314 250 316 256 319 C262 316 272 314 284 322 C272 324 262 324 256 324 C250 324 240 324 228 322 Z" fill="#7A4A42"/>
    <path d="M228 322 C240 340 272 340 284 322 C272 326 240 326 228 322 Z" fill="#9A6656"/>
    <path d="M246 331 C252 333 260 333 266 331" fill="none" stroke="#C08A78" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  </g>
  <!-- Glasses -->
  <path d="M150 230 L136 238" stroke="#121214" stroke-width="6" stroke-linecap="round"/>
  <path d="M362 230 L376 238" stroke="#121214" stroke-width="6" stroke-linecap="round"/>
  <rect x="152" y="216" width="94" height="66" rx="10" fill="url(#lens)" stroke="#121214" stroke-width="9"/>
  <rect x="266" y="216" width="94" height="66" rx="10" fill="url(#lens)" stroke="#121214" stroke-width="9"/>
  <path d="M246 228 C250 222 262 222 266 228" fill="none" stroke="#121214" stroke-width="8" stroke-linecap="round"/>
  <path d="M158 214 L240 214 M272 214 L354 214" stroke="#2E3138" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="150" y="219" width="7" height="3" rx="1" fill="#C9A44C"/>
  <rect x="355" y="219" width="7" height="3" rx="1" fill="#C9A44C"/>
  <path d="M164 226 L186 226 L168 252 Z" fill="#FFFFFF" opacity="0.14"/>
  <path d="M278 226 L300 226 L282 252 Z" fill="#FFFFFF" opacity="0.14"/>
  ${bg === 'space' ? `<path d="M372 186 C380 214 378 236 374 252" fill="none" stroke="#3FD1FF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.6"/>
  <path d="M388 262 C386 274 382 282 376 286" fill="none" stroke="#3FD1FF" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.5"/>` : `<path d="M372 186 C380 214 378 236 374 252" fill="none" stroke="#ffd9b8" stroke-width="3" stroke-linecap="round" stroke-opacity="0.45"/>`}
</svg>`;
}

/** The front portrait as an <img>-ready data URI (HUD, cockpit). */
export const faceFrontURI = (opts) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(faceFrontSVG(opts));

/** Head-and-shoulders crop for the ship's cockpit (pilot looking up through the canopy). */
export const pilotSpriteURI = () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  faceFrontSVG({ eyes: 'open', bg: 'none' }).replace('viewBox="0 0 512 512" width="512" height="512"', 'viewBox="150 70 212 330" width="212" height="330"'));
