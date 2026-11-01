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
  C353 403 357 398 361 397
  C365 397 368 404 367 409
  C366 412 363 414 362 415
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
    <stop offset="0" stop-color="#e3a681"/><stop offset=".35" stop-color="#c6896a"/><stop offset=".75" stop-color="#8f5a44"/><stop offset="1" stop-color="#5c3628"/>
  </linearGradient>
  <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4a3226"/><stop offset=".5" stop-color="#2a1b14"/><stop offset="1" stop-color="#140c09"/>
  </linearGradient>
  <linearGradient id="foil" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e9e6f2"/><stop offset=".25" stop-color="#b9b4cc"/><stop offset=".6" stop-color="#7b7593"/><stop offset="1" stop-color="#3b3652"/>
  </linearGradient>
  <linearGradient id="foilSheen" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#ffe9d6" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".7" stop-color="#ffe0c8" stop-opacity=".35"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1f6a6e"/><stop offset=".5" stop-color="#0d4245"/><stop offset="1" stop-color="#06201f"/>
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
<g stroke="#6b4a38" stroke-opacity=".55" stroke-width="1.2" fill="none" stroke-linecap="round">
  <path d="M296 426 C282 432 270 442 264 458"/><path d="M300 432 C286 440 274 452 268 470"/>
  <path d="M302 446 C290 456 280 470 276 490"/><path d="M304 462 C294 476 288 492 290 508"/>
  <path d="M292 424 C278 428 266 438 260 452"/>
</g>
<g fill="#e9f2ff" opacity=".55">
  <circle cx="266" cy="446" r="1.3"/><circle cx="259" cy="468" r="1.1"/><circle cx="274" cy="436" r="1.2"/><circle cx="262" cy="490" r="1"/>
</g>
<!-- eyebrow -->
<path d="M318 428 C325 424 333 423.5 341 426" stroke="#2a1b14" stroke-width="3.2" fill="none" stroke-linecap="round"/>
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
<!-- rim light along the profile (warm overhead light) -->
<path d="M262 446 C270 432 286 424 300 420 M300 420 C312 417 320 416 326 417 C330 418 333 421 335 422 C339 420 343 416 348 410 C353 403 357 398 361 397 C365 397 368 404 367 409 M371 414 C373 415 374 417 375 418 C377 416 380 415 382 417 M384 422 C389 420 394 418 398 420 C404 423 407 430 405 438"
  stroke="#ffd9b8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85" filter="url(#glow)"/>

<!-- neck ring of the cryo suit -->
<path d="M424 462 L450 456 L452 524 L426 524 Z" fill="#2c2944"/>
<path d="M424 462 L450 456 L452 524 L426 524 Z" fill="none" stroke="#e8a87c" stroke-opacity=".5" stroke-width="1.4"/>
<g fill="#ffcf9f" filter="url(#glow)"><circle cx="438" cy="474" r="2"/><circle cx="439" cy="490" r="2"/><circle cx="439" cy="506" r="2"/></g>
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
<path d="M484 466 C560 464 620 468 644 470 C700 466 740 460 766 458" stroke="#e8a87c" stroke-opacity=".55" stroke-width="1.4" fill="none"/>
<path d="M642 462 C650 470 650 480 642 486" stroke="#06201f" stroke-opacity=".6" stroke-width="1.5" fill="none"/>
<rect x="752" y="449" width="16" height="24" rx="4" fill="#2c2944"/>
<rect x="752" y="449" width="16" height="24" rx="4" fill="none" stroke="#e8a87c" stroke-opacity=".6" stroke-width="1.2"/>

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
