import React from 'react';
import type { SymbolId } from '../engine/LuxuryEngine';

/**
 * Diamond Riches symbol art — original geometric SVG (no third-party sprites).
 * Mirrors the getSymbolSVG() convention from TripleSevensSymbols: a switch
 * that returns an inline <svg viewBox="0 0 100 100"> per symbol id.
 */

const DEFS = (
  <>
    <linearGradient id="lux-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFF1B8" />
      <stop offset="45%" stopColor="#FFD23D" />
      <stop offset="100%" stopColor="#9A6B0E" />
    </linearGradient>
    <linearGradient id="lux-gold-bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFE07A" />
      <stop offset="100%" stopColor="#B8860B" />
    </linearGradient>
    <linearGradient id="lux-silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F4F6FA" />
      <stop offset="50%" stopColor="#C2C8D4" />
      <stop offset="100%" stopColor="#7B8392" />
    </linearGradient>
    <linearGradient id="lux-jet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="55%" stopColor="#D8DEEA" />
      <stop offset="100%" stopColor="#8A93A6" />
    </linearGradient>
    <linearGradient id="lux-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#7FC9FF" />
      <stop offset="100%" stopColor="#1E6FB8" />
    </linearGradient>
    <linearGradient id="lux-car" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FF6A6A" />
      <stop offset="100%" stopColor="#A1101B" />
    </linearGradient>
    <radialGradient id="lux-diamond" cx="42%" cy="32%" r="75%">
      <stop offset="0%" stopColor="#EAFBFF" />
      <stop offset="45%" stopColor="#7FE3F5" />
      <stop offset="100%" stopColor="#2A8FC8" />
    </radialGradient>
    <linearGradient id="lux-coin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFE680" />
      <stop offset="50%" stopColor="#F2B521" />
      <stop offset="100%" stopColor="#8A5A0B" />
    </linearGradient>
    <linearGradient id="lux-money" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#7BD88F" />
      <stop offset="100%" stopColor="#1F7A3D" />
    </linearGradient>
    {/* BOW_TIE */}
    <linearGradient id="bt-wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#2A1A3A" />
      <stop offset="100%" stopColor="#160A24" />
    </linearGradient>
    <linearGradient id="bt-knot" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#3A2A4A" />
      <stop offset="50%" stopColor="#52406A" />
      <stop offset="100%" stopColor="#3A2A4A" />
    </linearGradient>
    <linearGradient id="bt-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FFE566" />
      <stop offset="100%" stopColor="#C8900A" />
    </linearGradient>
    {/* SUNGLASSES */}
    <radialGradient id="sg-lens" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#3D2A52" />
      <stop offset="100%" stopColor="#1A0A28" />
    </radialGradient>
    {/* PERFUME */}
    <linearGradient id="pf-glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#1A5A96" />
      <stop offset="50%" stopColor="#4A9FD8" />
      <stop offset="100%" stopColor="#1A5A96" />
    </linearGradient>
  </>
);

/**
 * All gradient/filter defs, rendered ONCE in a hidden svg that stays mounted
 * for the life of the view. Embedding <defs> inside every symbol produced
 * duplicate ids (lux-gold, lux-diamond, …); when reels spun and the svg that
 * "owned" the first instance of an id unmounted, every `url(#id)` reference in
 * the surviving symbols broke and they rendered with no fill (blank cells).
 * A single permanent defs block eliminates the duplicates entirely.
 */
export const LuxurySymbolDefs = (): React.ReactElement => (
  <svg
    width="0"
    height="0"
    aria-hidden="true"
    focusable="false"
    style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
  >
    <defs>
      {DEFS}
      <filter id="lux-wild-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id="lux-coin-burst" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#2A5BC8" />
        <stop offset="70%" stopColor="#102A66" />
        <stop offset="100%" stopColor="#081A40" />
      </radialGradient>
    </defs>
  </svg>
);

const svgProps = { viewBox: '0 0 100 100', xmlns: 'http://www.w3.org/2000/svg' };

export const getLuxurySymbolSVG = (id: SymbolId): React.ReactElement => {
  switch (id) {
    case 'JET':
      return (
        <svg {...svgProps}>
          <g transform="rotate(-18 50 50)">
            {/* Fuselage */}
            <path
              d="M 12 52 Q 30 44 60 45 L 88 47 Q 94 50 88 53 L 60 55 Q 30 56 12 52 Z"
              fill="url(#lux-jet)" stroke="#3A4252" strokeWidth="2" strokeLinejoin="round"
            />
            {/* Nose */}
            <path d="M 86 47 Q 96 50 86 53 Z" fill="#9AA3B5" />
            {/* Swept wing */}
            <path d="M 44 50 L 26 78 L 40 78 L 60 51 Z" fill="url(#lux-silver)" stroke="#3A4252" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M 46 49 L 30 22 L 44 22 L 62 49 Z" fill="#D8DEEA" stroke="#3A4252" strokeWidth="1.6" strokeLinejoin="round" />
            {/* Tail fin */}
            <path d="M 16 51 L 8 34 L 20 36 L 28 50 Z" fill="url(#lux-silver)" stroke="#3A4252" strokeWidth="1.6" strokeLinejoin="round" />
            {/* Windows */}
            <g fill="#1E6FB8">
              <circle cx="56" cy="49" r="2" /><circle cx="64" cy="49.2" r="2" />
              <circle cx="72" cy="49.5" r="2" /><circle cx="80" cy="50" r="1.8" />
            </g>
          </g>
        </svg>
      );

    case 'YACHT':
      return (
        <svg {...svgProps}>
          {/* Water */}
          <path d="M 4 78 Q 26 84 50 78 Q 74 72 96 78 L 96 92 L 4 92 Z" fill="url(#lux-sky)" opacity="0.55" />
          {/* Hull */}
          <path d="M 14 64 L 90 64 L 78 80 Q 50 86 22 80 Z" fill="url(#lux-silver)" stroke="#3A4252" strokeWidth="2" strokeLinejoin="round" />
          {/* Decks */}
          <path d="M 26 64 L 80 64 L 78 52 L 34 52 Z" fill="#EDF1F7" stroke="#3A4252" strokeWidth="1.6" />
          <path d="M 40 52 L 74 52 L 72 42 L 46 42 Z" fill="#FFFFFF" stroke="#3A4252" strokeWidth="1.4" />
          {/* Mast + windows */}
          <rect x="58" y="22" width="2.4" height="20" fill="#3A4252" />
          <g fill="#1E6FB8">
            <rect x="38" y="56" width="6" height="5" /><rect x="48" y="56" width="6" height="5" />
            <rect x="58" y="56" width="6" height="5" /><rect x="68" y="56" width="6" height="5" />
          </g>
        </svg>
      );

    case 'CAR':
      return (
        <svg {...svgProps}>
          {/* Body */}
          <path
            d="M 8 64 Q 14 50 30 48 Q 40 36 56 36 Q 76 36 84 50 Q 92 52 94 62 L 92 70 L 8 70 Z"
            fill="url(#lux-car)" stroke="#5A0A12" strokeWidth="2" strokeLinejoin="round"
          />
          {/* Cabin glass */}
          <path d="M 36 48 Q 44 40 56 40 Q 68 40 74 50 Z" fill="#BfE4FF" stroke="#5A0A12" strokeWidth="1.4" />
          {/* Side accent */}
          <path d="M 14 63 L 88 63" stroke="#FFD23D" strokeWidth="2" opacity="0.7" />
          {/* Wheels */}
          <g>
            <circle cx="30" cy="70" r="11" fill="#1A1A1E" stroke="#000" strokeWidth="1.5" />
            <circle cx="30" cy="70" r="4.5" fill="url(#lux-silver)" />
            <circle cx="74" cy="70" r="11" fill="#1A1A1E" stroke="#000" strokeWidth="1.5" />
            <circle cx="74" cy="70" r="4.5" fill="url(#lux-silver)" />
          </g>
          <ellipse cx="50" cy="44" rx="20" ry="4" fill="#FFFFFF" opacity="0.35" />
        </svg>
      );

    case 'MONEY':
      return (
        <svg {...svgProps}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${10 + i * 4} ${64 - i * 16})`}>
              <rect width="74" height="26" rx="3" fill="url(#lux-money)" stroke="#0F4A24" strokeWidth="1.8" />
              <circle cx="37" cy="13" r="9" fill="none" stroke="#0F4A24" strokeWidth="1.6" />
              <text x="37" y="18" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fontWeight="900" fill="#0F4A24">$</text>
              <circle cx="9" cy="13" r="3" fill="none" stroke="#0F4A24" strokeWidth="1.2" />
              <circle cx="65" cy="13" r="3" fill="none" stroke="#0F4A24" strokeWidth="1.2" />
            </g>
          ))}
        </svg>
      );

    case 'RING':
      return (
        <svg {...svgProps}>
          {/* Band */}
          <ellipse cx="50" cy="66" rx="26" ry="24" fill="none" stroke="url(#lux-gold)" strokeWidth="9" />
          {/* Prongs */}
          <path d="M 42 40 L 50 30 L 58 40 L 58 48 L 42 48 Z" fill="none" stroke="url(#lux-gold)" strokeWidth="3" />
          {/* Diamond */}
          <path d="M 50 18 L 64 32 L 50 52 L 36 32 Z" fill="url(#lux-diamond)" stroke="#1C6E96" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M 36 32 L 64 32 M 50 18 L 50 52 M 43 25 L 57 39 M 57 25 L 43 39" stroke="#FFFFFF" strokeWidth="1" opacity="0.7" />
          <circle cx="44" cy="27" r="2" fill="#FFFFFF" opacity="0.9" />
        </svg>
      );

    case 'WATCH':
      return (
        <svg {...svgProps}>
          {/* Straps */}
          <rect x="40" y="8" width="20" height="26" rx="4" fill="#2A2C34" />
          <rect x="40" y="66" width="20" height="26" rx="4" fill="#2A2C34" />
          {/* Case */}
          <circle cx="50" cy="50" r="28" fill="url(#lux-gold)" stroke="#7A5408" strokeWidth="2" />
          <circle cx="50" cy="50" r="21" fill="#10131A" stroke="#7A5408" strokeWidth="1.5" />
          {/* Hands */}
          <line x1="50" y1="50" x2="50" y2="35" stroke="#FFF1B8" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="50" y1="50" x2="62" y2="56" stroke="#FFF1B8" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.4" fill="#FFD23D" />
          {/* Crown */}
          <rect x="77" y="47" width="5" height="6" rx="1" fill="url(#lux-gold)" />
          {[0, 90, 180, 270].map((a) => (
            <circle key={a} cx={50 + 16 * Math.cos((a * Math.PI) / 180)} cy={50 + 16 * Math.sin((a * Math.PI) / 180)} r="1.4" fill="#FFF1B8" />
          ))}
        </svg>
      );

    case 'GOLD_BARS':
      return (
        <svg {...svgProps}>
          <g stroke="#7A5408" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M 20 50 L 80 50 L 88 64 L 12 64 Z" fill="url(#lux-gold-bar)" />
            <path d="M 4 66 L 46 66 L 54 82 L -2 82 Z" transform="translate(6 0)" fill="url(#lux-gold-bar)" />
            <path d="M 50 66 L 92 66 L 98 82 L 44 82 Z" fill="url(#lux-gold-bar)" />
            <path d="M 32 34 L 68 34 L 74 48 L 26 48 Z" fill="url(#lux-gold-bar)" />
          </g>
          <path d="M 34 37 L 66 37" stroke="#FFF7D6" strokeWidth="2" opacity="0.7" />
          <path d="M 22 53 L 78 53" stroke="#FFF7D6" strokeWidth="2" opacity="0.6" />
        </svg>
      );

    case 'SILVER_BARS':
      return (
        <svg {...svgProps}>
          <g stroke="#5A6170" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M 22 52 L 78 52 L 86 66 L 14 66 Z" fill="url(#lux-silver)" />
            <path d="M 12 68 L 52 68 L 60 84 L 4 84 Z" fill="url(#lux-silver)" />
            <path d="M 56 68 L 92 68 L 98 84 L 48 84 Z" fill="url(#lux-silver)" />
          </g>
          <path d="M 24 55 L 76 55" stroke="#FFFFFF" strokeWidth="2" opacity="0.65" />
          <path d="M 14 71 L 50 71" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
        </svg>
      );

    case 'GOLD_BAR':
      return (
        <svg {...svgProps}>
          <path d="M 22 40 L 78 40 L 90 70 L 10 70 Z" fill="url(#lux-gold-bar)" stroke="#7A5408" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M 22 40 L 78 40 L 74 48 L 26 48 Z" fill="#FFF7D6" opacity="0.65" />
          <text x="50" y="63" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontWeight="900" fill="#7A5408">999.9</text>
        </svg>
      );

    case 'WILD':
      return (
        <svg {...svgProps}>
          <g filter="url(#lux-wild-glow)">
            <path d="M 30 34 L 50 13 L 70 34 L 50 74 Z" fill="url(#lux-diamond)" stroke="#1C6E96" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M 30 34 L 70 34 M 50 13 L 50 74 M 30 34 L 50 50 L 70 34 M 39 24 L 50 50 M 61 24 L 50 50" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.75" fill="none" />
            <path d="M 37 27 L 44 20" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.9" strokeLinecap="round" />
          </g>
          {/* Ornate gold ribbon with the cursive "Double" label — the
              cabinet's visual signal for the wild-doubling mechanic. */}
          <path d="M 14 80 Q 50 70 86 80 L 86 94 Q 50 86 14 94 Z" fill="#9A1B1B" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />
          <text x="50" y="91" textAnchor="middle" fontFamily="'Snell Roundhand','Apple Chancery','Brush Script MT',cursive" fontSize="16" fontStyle="italic" fontWeight="700" fill="#FFE07A">Double</text>
        </svg>
      );

    case 'SCATTER':
      return (
        <svg {...svgProps}>
          {/* Deep-blue radial-burst background plate */}
          <rect x="6" y="6" width="88" height="88" rx="10" fill="url(#lux-coin-burst)" stroke="#1C3A78" strokeWidth="2" />
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            return (
              <line key={i} x1="50" y1="50"
                x2={50 + 46 * Math.cos(a)} y2={50 + 46 * Math.sin(a)}
                stroke="#3E6FD0" strokeWidth="2" opacity="0.35" />
            );
          })}
          {/* Classic eagle/liberty-style gold coin */}
          <circle cx="50" cy="50" r="30" fill="url(#lux-coin)" stroke="#6E4708" strokeWidth="3" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#FFF1B8" strokeWidth="1.6" opacity="0.7" />
          <path d="M 50 33 L 57 47 L 50 43 L 43 47 Z" fill="#6E4708" />
          <path d="M 38 52 Q 50 64 62 52 Q 56 60 50 60 Q 44 60 38 52 Z" fill="#6E4708" />
          <ellipse cx="42" cy="40" rx="7" ry="4" fill="#FFFFFF" opacity="0.4" transform="rotate(-30 42 40)" />
        </svg>
      );

    case 'BOW_TIE':
      return (
        <svg {...svgProps}>
          <path d="M12,36 Q10,28 18,32 L44,48 L44,52 L18,68 Q10,72 12,64 Q14,56 20,50 Q14,44 12,36 Z"
            fill="url(#bt-wing)" stroke="#6A4A8A" strokeWidth="1.5" />
          <path d="M88,36 Q90,28 82,32 L56,48 L56,52 L82,68 Q90,72 88,64 Q86,56 80,50 Q86,44 88,36 Z"
            fill="url(#bt-wing)" stroke="#6A4A8A" strokeWidth="1.5" />
          <path d="M16,40 Q14,50 16,60" stroke="#8A60AA" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M84,40 Q86,50 84,60" stroke="#8A60AA" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
          <ellipse cx="50" cy="50" rx="8" ry="11" fill="url(#bt-knot)" stroke="#8A60AA" strokeWidth="1.8" />
          <ellipse cx="50" cy="50" rx="8" ry="11" fill="none" stroke="url(#bt-gold)" strokeWidth="0.8" opacity="0.6" />
          <path d="M12,36 Q10,28 18,32 L44,48" fill="none" stroke="url(#bt-gold)" strokeWidth="0.8" opacity="0.4" />
          <path d="M12,64 Q10,72 18,68 L44,52" fill="none" stroke="url(#bt-gold)" strokeWidth="0.8" opacity="0.4" />
          <path d="M88,36 Q90,28 82,32 L56,48" fill="none" stroke="url(#bt-gold)" strokeWidth="0.8" opacity="0.4" />
          <path d="M88,64 Q90,72 82,68 L56,52" fill="none" stroke="url(#bt-gold)" strokeWidth="0.8" opacity="0.4" />
        </svg>
      );

    case 'SUNGLASSES':
      return (
        <svg {...svgProps}>
          {/* Left aviator lens */}
          <path d="M8,46 Q10,26 28,24 Q44,22 48,40 Q50,56 36,62 Q16,68 9,56 Z"
            fill="url(#sg-lens)" stroke="url(#lux-gold)" strokeWidth="3.5" />
          {/* Right aviator lens */}
          <path d="M92,46 Q90,26 72,24 Q56,22 52,40 Q50,56 64,62 Q84,68 91,56 Z"
            fill="url(#sg-lens)" stroke="url(#lux-gold)" strokeWidth="3.5" />
          {/* Bridge */}
          <path d="M48,38 Q50,36 52,38" fill="none" stroke="url(#lux-gold)" strokeWidth="3" strokeLinecap="round" />
          {/* Arms */}
          <path d="M9,50 L2,48" stroke="url(#lux-gold)" strokeWidth="3" strokeLinecap="round" />
          <path d="M91,50 L98,48" stroke="url(#lux-gold)" strokeWidth="3" strokeLinecap="round" />
          {/* Lens reflections */}
          <path d="M15,34 Q22,28 30,32" stroke="#B090CC" strokeWidth="1.8" fill="none" opacity="0.65" strokeLinecap="round" />
          <path d="M85,34 Q78,28 70,32" stroke="#B090CC" strokeWidth="1.8" fill="none" opacity="0.65" strokeLinecap="round" />
        </svg>
      );

    case 'PERFUME':
      return (
        <svg {...svgProps}>
          {/* Atomizer bulb */}
          <ellipse cx="72" cy="74" rx="12" ry="9" fill="#2A1A0A" stroke="url(#lux-gold)" strokeWidth="1.5" />
          <path d="M60,72 L50,72" stroke="url(#lux-gold)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Bottle body */}
          <path d="M24,40 L24,78 Q24,86 32,86 L58,86 Q66,86 66,78 L66,40 Z"
            fill="url(#pf-glass)" stroke="#1C4A78" strokeWidth="2" strokeLinejoin="round" />
          {/* Shoulder */}
          <path d="M24,40 Q26,30 36,28 L54,28 Q64,30 66,40 Z" fill="#5AAFDC" stroke="#1C4A78" strokeWidth="1.5" />
          {/* Neck */}
          <rect x="37" y="16" width="16" height="14" rx="3" fill="url(#lux-gold)" stroke="#7A5408" strokeWidth="1.5" />
          {/* Cap */}
          <rect x="33" y="10" width="24" height="8" rx="3" fill="url(#lux-gold)" stroke="#7A5408" strokeWidth="1.5" />
          {/* Nozzle */}
          <rect x="47" y="5" width="5" height="7" rx="1.5" fill="url(#lux-gold)" />
          {/* Label */}
          <rect x="28" y="52" width="34" height="22" rx="2" fill="#EAE0F8" stroke="#8A60AA" strokeWidth="1" />
          <text x="45" y="67" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontStyle="italic" fill="#6A3A8A">LUXE</text>
          {/* Glass highlight */}
          <path d="M28,44 Q26,62 28,76" stroke="#EAFBFF" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round" />
        </svg>
      );

    // Source-faithful symbols that reuse existing art (visual equivalents).
    case 'SPORTS_CAR':
      // Visually the same as CAR (red sports car). Identical art is fine —
      // server emits index 3 only and we render as the SPORTS_CAR name.
      return getLuxurySymbolSVG('CAR');

    case 'CASH_WADS':
      // Stack-of-bills art carries over from the old MONEY symbol.
      return getLuxurySymbolSVG('MONEY');

    case 'GOLD_SMALL':
      // Smaller gold-bar art — reuse the existing GOLD_BAR singleton SVG.
      return getLuxurySymbolSVG('GOLD_BAR');

    // ── Placeholder art for source-faithful symbols with no bespoke SVG yet.
    //    FLAG: design needs to ship dedicated SVGs for MOTORBOAT, WHEEL,
    //    WHITE_CARD. Until then these geometric stand-ins render so the grid
    //    doesn't crash or fall back to raw text.
    case 'MOTORBOAT':
      return (
        <svg {...svgProps}>
          <path d="M 4 78 Q 26 84 50 78 Q 74 72 96 78 L 96 92 L 4 92 Z" fill="url(#lux-sky)" opacity="0.55" />
          {/* Speedboat hull (slimmer than yacht) */}
          <path d="M 10 60 L 92 60 L 80 78 Q 50 84 20 78 Z" fill="url(#lux-car)" stroke="#5A0A12" strokeWidth="2" strokeLinejoin="round" />
          {/* Windscreen */}
          <path d="M 36 60 L 70 60 L 64 46 L 42 46 Z" fill="#BFE4FF" stroke="#3A4252" strokeWidth="1.4" />
          {/* Trim accent */}
          <path d="M 14 64 L 88 64" stroke="#FFD23D" strokeWidth="2" opacity="0.8" />
          {/* Spray */}
          <path d="M 8 70 Q 4 64 12 60" stroke="#EAFBFF" strokeWidth="1.6" fill="none" opacity="0.7" />
        </svg>
      );

    case 'WHEEL':
      // Redesigned to be visually unmistakable from the SCATTER coin.
      // No gold, no concentric gold rings, no central eagle motif. A flat
      // automotive tire with 5 chrome lug nuts in a pentagon pattern and a
      // dark hub. Aspect-corrected so the silhouette reads as "tire" first.
      return (
        <svg {...svgProps}>
          {/* Tire (matte black with thick sidewall) */}
          <circle cx="50" cy="50" r="40" fill="#0E0E12" stroke="#000" strokeWidth="2" />
          <circle cx="50" cy="50" r="33" fill="#1A1A20" />
          {/* Tread pattern: 12 short radial dashes on the sidewall */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const r1 = 33, r2 = 38;
            return (
              <line key={`tread-${i}`}
                x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
                x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
                stroke="#3A3A42" strokeWidth="2" strokeLinecap="butt"
              />
            );
          })}
          {/* Steel rim — dark gunmetal, no silver gradient (avoid coin look) */}
          <circle cx="50" cy="50" r="26" fill="#2E323A" stroke="#0E0E12" strokeWidth="2" />
          {/* Hub centre */}
          <circle cx="50" cy="50" r="8" fill="#181B22" stroke="#3A3A42" strokeWidth="1.2" />
          {/* 5 lug nuts in a pentagon — the signature "this is a wheel" cue */}
          {[0, 72, 144, 216, 288].map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            return (
              <g key={`lug-${deg}`}>
                <circle
                  cx={50 + 16 * Math.cos(a)} cy={50 + 16 * Math.sin(a)}
                  r="3.6" fill="#B8BEC9" stroke="#0E0E12" strokeWidth="1"
                />
                <circle
                  cx={50 + 16 * Math.cos(a)} cy={50 + 16 * Math.sin(a)}
                  r="1.6" fill="#0E0E12"
                />
              </g>
            );
          })}
          {/* Five short spokes connecting hub to rim — visually opposite of
              the coin's solid disc face. */}
          {[0, 72, 144, 216, 288].map((deg) => {
            const a = ((deg - 90 + 36) * Math.PI) / 180;
            return (
              <line key={`spoke-${deg}`}
                x1={50 + 8 * Math.cos(a)} y1={50 + 8 * Math.sin(a)}
                x2={50 + 22 * Math.cos(a)} y2={50 + 22 * Math.sin(a)}
                stroke="#454952" strokeWidth="3.2" strokeLinecap="round"
              />
            );
          })}
        </svg>
      );

    case 'WHITE_CARD':
      return (
        <svg {...svgProps}>
          {/* Credit-card shape */}
          <rect x="12" y="26" width="76" height="48" rx="6" fill="#F4F6FA" stroke="#3A4252" strokeWidth="2" />
          {/* Magnetic stripe */}
          <rect x="12" y="34" width="76" height="8" fill="#1A1A1E" opacity="0.85" />
          {/* Embossed number rows */}
          <rect x="20" y="52" width="14" height="3.2" rx="0.5" fill="#3A4252" />
          <rect x="38" y="52" width="14" height="3.2" rx="0.5" fill="#3A4252" />
          <rect x="56" y="52" width="14" height="3.2" rx="0.5" fill="#3A4252" />
          <rect x="20" y="60" width="32" height="3.2" rx="0.5" fill="#3A4252" />
          {/* Chip */}
          <rect x="68" y="58" width="14" height="10" rx="1.5" fill="url(#lux-gold-bar)" stroke="#7A5408" strokeWidth="1" />
        </svg>
      );

    case 'BLANK':
      return (
        <svg {...svgProps}>
          <rect x="8" y="8" width="84" height="84" rx="10" fill="#1A0E2A" stroke="#3A2A4A" strokeWidth="1.5" opacity="0.6" />
        </svg>
      );

    default:
      return <text>{id}</text>;
  }
};

/** Human-readable label per symbol id (paytable / aria). */
export const SYMBOL_LABELS: Record<SymbolId, string> = {
  // Source-faithful Pot-O-Gold names.
  YACHT: 'Luxury Yacht',
  MOTORBOAT: 'Motorboat',
  SPORTS_CAR: 'Sports Car',
  RING: 'Diamond Ring',
  CASH_WADS: 'Cash Wads',
  WHEEL: 'Wheel',
  GOLD_BARS: 'Gold Bars',
  WHITE_CARD: 'White Card',
  GOLD_SMALL: 'Gold Bar (small)',
  WILD: 'Diamond Wild',
  SCATTER: 'Gold Coin',
  BLANK: 'Blank',
  // Legacy (never rendered in prod).
  JET: 'Private Jet',
  CAR: 'Sports Car',
  MONEY: 'Cash Stack',
  WATCH: 'Luxury Watch',
  SILVER_BARS: 'Silver Bars',
  GOLD_BAR: 'Gold Bar',
  BOW_TIE: 'Bow Tie',
  SUNGLASSES: 'Sunglasses',
  PERFUME: 'Perfume',
};
