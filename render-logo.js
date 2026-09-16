import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// SVG representing the exact Innovatiview logo with:
// - Deep navy blue brand color #0B2545
// - Capital "I", lowercase "nn", cog/gear with camera aperture for "o", "vatiview"
// - Solid horizontal underline bar
// - "BE DISTINCT" right-aligned under the bar

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 160" width="760" height="160">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&amp;family=Plus+Jakarta+Sans:wght@800;900&amp;display=swap');
      .brand-text {
        font-family: 'Plus Jakarta Sans', 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 900;
        fill: #0B2545;
      }
      .distinct-text {
        font-family: 'Plus Jakarta Sans', 'Montserrat', 'Arial Black', -apple-system, sans-serif;
        font-weight: 900;
        letter-spacing: 0.18em;
        fill: #0B2545;
      }
    </style>
  </defs>

  <!-- Letter I -->
  <path d="M 28 32 L 47 32 L 47 104 L 28 104 Z" fill="#0B2545" />

  <!-- Letter n (first) -->
  <path d="M 57 52 L 75 52 L 75 60 C 80 54 88 50.5 98 50.5 C 113 50.5 121 59 121 73 L 121 104 L 102 104 L 102 76 C 102 69 98 66 91 66 C 83 66 76 71 76 79 L 76 104 L 57 104 Z" fill="#0B2545" />

  <!-- Letter n (second) -->
  <path d="M 132 52 L 150 52 L 150 60 C 155 54 163 50.5 173 50.5 C 188 50.5 196 59 196 73 L 196 104 L 177 104 L 177 76 C 177 69 173 66 166 66 C 158 66 151 71 151 79 L 151 104 L 132 104 Z" fill="#0B2545" />

  <!-- Gear/Aperture 'o' centered around x=242, y=78 -->
  <g transform="translate(242, 78)">
    <!-- 8 Cog Teeth -->
    <g fill="#0B2545">
      <!-- 0 deg (Top) -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" />
      <!-- 45 deg -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(45)" />
      <!-- 90 deg (Right) -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(90)" />
      <!-- 135 deg -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(135)" />
      <!-- 180 deg (Bottom) -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(180)" />
      <!-- 225 deg -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(225)" />
      <!-- 270 deg (Left) -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(270)" />
      <!-- 315 deg -->
      <rect x="-4.5" y="-31" width="9" height="7" rx="1.5" transform="rotate(315)" />
    </g>

    <!-- Outer Gear Body Ring -->
    <circle cx="0" cy="0" r="26" fill="none" stroke="#0B2545" stroke-width="8" />

    <!-- Inner Camera Lens Aperture Ring / Shutter Blades -->
    <circle cx="0" cy="0" r="16" fill="none" stroke="#0B2545" stroke-width="2.5" />
    <!-- Aperture curved blade accent -->
    <path d="M -11 -6 A 14 14 0 0 1 12 5" fill="none" stroke="#0B2545" stroke-width="2.5" stroke-linecap="round" />
    <path d="M -6 11 A 14 14 0 0 1 7 -11" fill="none" stroke="#0B2545" stroke-width="2.5" stroke-linecap="round" />
    <!-- Center lens dot -->
    <circle cx="0" cy="0" r="4" fill="#0B2545" />
  </g>

  <!-- Letter v -->
  <path d="M 283 52 L 302 52 L 314 89 L 326 52 L 345 52 L 324 104 L 304 104 Z" fill="#0B2545" />

  <!-- Letter a -->
  <path d="M 388 52 L 406 52 L 406 104 L 388 104 L 388 96 C 383 102 374 106 363 106 C 347 106 335 95 335 78 C 335 62 348 51 364 51 C 374 51 382 55 388 61 Z M 388 77 C 388 69 381 65 373 65 C 364 65 356 70 356 78 C 356 86 363 92 372 92 C 381 92 388 86 388 77 Z" fill="#0B2545" />

  <!-- Letter t -->
  <path d="M 425 38 L 444 38 L 444 52 L 458 52 L 458 66 L 444 66 L 444 91 C 444 95 446 97 451 97 C 454 97 456 96 458 95 L 460 105 C 455 107 449 108 443 108 C 431 108 425 101 425 90 L 425 66 L 415 66 L 415 52 L 425 52 Z" fill="#0B2545" />

  <!-- Letter i -->
  <path d="M 470 34 L 488 34 L 488 47 L 470 47 Z M 470 52 L 488 52 L 488 104 L 470 104 Z" fill="#0B2545" />

  <!-- Letter v -->
  <path d="M 498 52 L 517 52 L 529 89 L 541 52 L 560 52 L 539 104 L 519 104 Z" fill="#0B2545" />

  <!-- Letter i -->
  <path d="M 570 34 L 588 34 L 588 47 L 570 47 Z M 570 52 L 588 52 L 588 104 L 570 104 Z" fill="#0B2545" />

  <!-- Letter e -->
  <path d="M 635 81 L 602 81 C 603 89 609 94 619 94 C 625 94 630 91 633 87 L 647 95 C 640 103 630 107 618 107 C 599 107 584 94 584 78 C 584 62 598 51 617 51 C 636 51 648 64 648 81 Z M 602 70 L 630 70 C 629 64 624 61 617 61 C 609 61 604 65 602 70 Z" fill="#0B2545" />

  <!-- Letter w -->
  <path d="M 654 52 L 671 52 L 681 88 L 693 52 L 708 52 L 720 88 L 730 52 L 747 52 L 730 104 L 712 104 L 701 70 L 689 104 L 671 104 Z" fill="#0B2545" />

  <!-- Main Solid Underline Bar (from x=26 to x=450) -->
  <rect x="26" y="117" width="424" height="11" fill="#0B2545" rx="1" />

  <!-- "BE DISTINCT" (aligned under the right half of the logo) -->
  <text x="746" y="128" text-anchor="end" class="distinct-text" font-size="20">BE DISTINCT</text>
</svg>`;

const resvg = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 1200,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

// Ensure output directories exist
fs.mkdirSync(path.resolve('./public'), { recursive: true });
fs.mkdirSync(path.resolve('./src/assets'), { recursive: true });

// Write to public/Inno logo.png and public/inno-logo.png
fs.writeFileSync(path.resolve('./public/Inno logo.png'), pngBuffer);
fs.writeFileSync(path.resolve('./public/inno-logo.png'), pngBuffer);
fs.writeFileSync(path.resolve('./public/innovatiview-logo.png'), pngBuffer);
fs.writeFileSync(path.resolve('./src/assets/innovatiview-logo.png'), pngBuffer);
fs.writeFileSync(path.resolve('./src/assets/innovatiview-logo.svg'), svgContent);

console.log('Successfully generated Innovatiview logo assets in public and src/assets!');
