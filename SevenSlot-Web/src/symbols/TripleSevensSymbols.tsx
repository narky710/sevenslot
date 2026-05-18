import React from 'react';

/**
 * Triple Sevens arcade symbol SVG components
 * Extracted directly from POG 510C mockups HTML
 * These symbols match the official mockup designs exactly
 */

// Shared gradients - rendered once in the SVG defs of the first symbol
const GRADIENTS_DEFS = (
  <>
    <linearGradient id="grad-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F2F2F4" />
      <stop offset="50%" stopColor="#BFC2CC" />
      <stop offset="100%" stopColor="#5C5F6B" />
    </linearGradient>
    <linearGradient id="grad-bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F4ECC8" />
      <stop offset="100%" stopColor="#D9CFA0" />
    </linearGradient>
    <linearGradient id="grad-red7" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FF4040" />
      <stop offset="100%" stopColor="#A50F0F" />
    </linearGradient>
    <linearGradient id="grad-blue7" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4A7AE8" />
      <stop offset="100%" stopColor="#1A38B0" />
    </linearGradient>
    <radialGradient id="grad-apple" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#FF8A8A" />
      <stop offset="60%" stopColor="#D62828" />
      <stop offset="100%" stopColor="#8A1010" />
    </radialGradient>
    <radialGradient id="grad-orange" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#FFCB7A" />
      <stop offset="60%" stopColor="#F08020" />
      <stop offset="100%" stopColor="#A0500A" />
    </radialGradient>
    <radialGradient id="grad-plum" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#B98DD6" />
      <stop offset="60%" stopColor="#6B2B8C" />
      <stop offset="100%" stopColor="#3A1252" />
    </radialGradient>
    <radialGradient id="grad-lemon" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#FFF089" />
      <stop offset="60%" stopColor="#F5D02A" />
      <stop offset="100%" stopColor="#A88810" />
    </radialGradient>
    <radialGradient id="grad-bell" cx="35%" cy="25%" r="80%">
      <stop offset="0%" stopColor="#FFF089" />
      <stop offset="55%" stopColor="#FFC828" />
      <stop offset="100%" stopColor="#A77818" />
    </radialGradient>
  </>
);

const SYMBOLS_DEFS = (
  <>
    <symbol id="seven-shape" viewBox="0 0 100 100">
      <path
        d="M 18 18 L 86 18 L 86 34 L 70 34 L 50 92 L 30 92 L 50 34 L 18 34 Z"
        transform="skewX(-10)"
        stroke="#000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </symbol>
    <symbol id="bar-plaque" viewBox="0 0 100 30">
      <rect x="6" y="2" width="88" height="26" rx="4" fill="url(#grad-bar)" stroke="#000" strokeWidth="2" />
      <text
        x="50"
        y="22"
        textAnchor="middle"
        fontFamily="'Anton',sans-serif"
        fontSize="20"
        fontWeight="900"
        fill="#E51E1E"
        letterSpacing="2"
      >
        BAR
      </text>
    </symbol>
  </>
);

export const getSymbolSVG = (symbolName: string): React.ReactElement => {
  const commonProps = { viewBox: '0 0 100 100', xmlns: 'http://www.w3.org/2000/svg' };

  switch (symbolName) {
    case 'Red 7':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <use href="#seven-shape" fill="url(#grad-red7)" />
          <path d="M 18 18 L 86 18 L 86 22 L 22 22 Z" transform="skewX(-10)" fill="#FFB0B0" opacity="0.8" />
        </svg>
      );

    case 'White 7':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <linearGradient id="grad-white7-temp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2F2F4" />
            <stop offset="50%" stopColor="#C0C0CC" />
            <stop offset="100%" stopColor="#5C5F6B" />
          </linearGradient>
          <use href="#seven-shape" fill="url(#grad-white7-temp)" />
          <path d="M 18 18 L 86 18 L 86 22 L 22 22 Z" transform="skewX(-10)" fill="#fff" opacity="0.7" />
        </svg>
      );

    case 'Blue 7':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <use href="#seven-shape" fill="url(#grad-blue7)" />
          <path d="M 18 18 L 86 18 L 86 22 L 22 22 Z" transform="skewX(-10)" fill="#A8C0FF" opacity="0.8" />
        </svg>
      );

    case 'Rainbow 7': {
      // Patriotic "777" jackpot — three side-by-side 7s with UNIFORM scale so each
      // 7 keeps its proper proportions (no smooshing). The trio nests with heavy
      // overlap via the natural slant; the result is slightly bigger than other
      // symbols, which is appropriate for the jackpot symbol.
      const sevenPath =
        'M 18 18 L 86 18 L 86 34 L 70 34 L 50 92 L 30 92 L 50 34 L 18 34 Z';
      const glossPath = 'M 22 20 L 84 20 L 84 24 L 26 24 Z';
      const tripleSeven = (tx: number, fillId: string, glossOpacity = 0.5) => (
        <g transform={`translate(${tx} 3) scale(0.85)`}>
          <path
            d={sevenPath}
            transform="skewX(-10)"
            fill={`url(#${fillId})`}
            stroke="#000"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d={glossPath}
            transform="skewX(-10)"
            fill="#FFFFFF"
            opacity={glossOpacity}
          />
        </g>
      );
      return (
        <svg {...commonProps}>
          <defs>
            {GRADIENTS_DEFS}
            {SYMBOLS_DEFS}
            <filter id="r7-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
              <feOffset dx="0.8" dy="2" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.6" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#r7-shadow)">
            {tripleSeven(-10, 'grad-red7', 0.5)}
            {tripleSeven(10, 'grad-chrome', 0.7)}
            {tripleSeven(30, 'grad-blue7', 0.5)}
          </g>
        </svg>
      );
    }

    case 'Triple BAR':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <use href="#bar-plaque" x="0" y="8" width="100" height="26" />
          <use href="#bar-plaque" x="0" y="38" width="100" height="26" />
          <use href="#bar-plaque" x="0" y="68" width="100" height="26" />
        </svg>
      );

    case 'Double BAR':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <use href="#bar-plaque" x="0" y="10" width="100" height="36" />
          <use href="#bar-plaque" x="0" y="54" width="100" height="36" />
        </svg>
      );

    case 'Single BAR':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}{SYMBOLS_DEFS}</defs>
          <use href="#bar-plaque" x="0" y="18" width="100" height="64" />
        </svg>
      );

    case 'Bell':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}</defs>
          {/* Hanger nub */}
          <rect x="46" y="6" width="8" height="6" fill="#4A2E1A" stroke="#000" strokeWidth="1.5" />
          {/* Bell body — widened so it matches the size of other symbols (~80 wide × 80 tall) */}
          <path
            d="M 50 12 C 22 12, 12 38, 14 70 L 8 76 L 8 86 L 92 86 L 92 76 L 86 70 C 88 38, 78 12, 50 12 Z"
            fill="url(#grad-bell)"
            stroke="#000"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Inner highlight */}
          <path
            d="M 32 22 C 24 32, 20 48, 22 64"
            fill="none"
            stroke="#FFF089"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Clapper */}
          <circle cx="50" cy="92" r="5" fill="#4A2E1A" stroke="#000" strokeWidth="1.5" />
        </svg>
      );

    case 'Apple':
      return (
        <svg {...commonProps}>
          <defs>
            {GRADIENTS_DEFS}
            <radialGradient id="grad-apple-v2" cx="35%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#FF9494" />
              <stop offset="55%" stopColor="#D62828" />
              <stop offset="100%" stopColor="#6E0F14" />
            </radialGradient>
            <linearGradient id="grad-apple-leaf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BC04C" />
              <stop offset="100%" stopColor="#2E7D32" />
            </linearGradient>
          </defs>

          {/* Leaf */}
          <path
            d="M 54 18 Q 76 8, 82 24 Q 70 32, 54 24 Z"
            fill="url(#grad-apple-leaf)"
            stroke="#000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M 58 19 Q 70 17, 80 23"
            stroke="#1F4F22"
            strokeWidth="0.8"
            fill="none"
            opacity="0.55"
          />

          {/* Stem */}
          <path
            d="M 52 22 Q 53 14, 56 12"
            stroke="#3D2410"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Apple body — two lobes meeting at top with slight indent */}
          <path
            d="M 50 24
               C 44 18, 30 16, 20 28
               C 8 42, 8 66, 20 82
               C 30 94, 44 96, 50 90
               C 56 96, 70 94, 80 82
               C 92 66, 92 42, 80 28
               C 70 16, 56 18, 50 24 Z"
            fill="url(#grad-apple-v2)"
            stroke="#000"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Glossy highlight */}
          <ellipse
            cx="34"
            cy="42"
            rx="7"
            ry="14"
            fill="#FFFFFF"
            opacity="0.45"
            transform="rotate(-18 34 42)"
          />

          {/* Smaller highlight */}
          <ellipse
            cx="42"
            cy="34"
            rx="3"
            ry="4"
            fill="#FFFFFF"
            opacity="0.6"
          />
        </svg>
      );

    case 'Watermelon':
      return (
        <svg {...commonProps}>
          <defs>
            {GRADIENTS_DEFS}
            <linearGradient id="grad-melon-rind" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4FB148" />
              <stop offset="100%" stopColor="#1A4D1C" />
            </linearGradient>
            <radialGradient id="grad-melon-flesh" cx="40%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#FF7088" />
              <stop offset="60%" stopColor="#E0354E" />
              <stop offset="100%" stopColor="#7E1224" />
            </radialGradient>
          </defs>

          {/* Tall stretched-ellipse half-slice so the slice fills most of the cell.
              Each layer is the same shape inset by a few units to create the
              rind → inner-rind → flesh layering. */}

          {/* Dark green outer rind — apex pushed up to y=8 to match other symbols */}
          <path
            d="M 8 90 A 42 82 0 0 1 92 90 Z"
            fill="url(#grad-melon-rind)"
            stroke="#000"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Light green inner rind stripe */}
          <path
            d="M 14 90 A 36 74 0 0 1 86 90 Z"
            fill="#A8DE7A"
          />

          {/* Pink/red flesh */}
          <path
            d="M 20 90 A 30 64 0 0 1 80 90 Z"
            fill="url(#grad-melon-flesh)"
            stroke="#7A1424"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />

          {/* Rind highlight (upper-left curve) */}
          <path
            d="M 16 76 Q 18 44, 36 24"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            fill="none"
            opacity="0.42"
            strokeLinecap="round"
          />

          {/* Flesh highlight */}
          <path
            d="M 28 64 Q 34 46, 48 38"
            stroke="#FFD2DC"
            strokeWidth="3"
            fill="none"
            opacity="0.55"
            strokeLinecap="round"
          />

          {/* Seeds — teardrop shape distributed naturally across the flesh */}
          <ellipse cx="50" cy="44" rx="2" ry="3.3" fill="#1A1A1A" transform="rotate(2 50 44)" />
          <ellipse cx="40" cy="54" rx="2" ry="3.3" fill="#1A1A1A" transform="rotate(-16 40 54)" />
          <ellipse cx="60" cy="54" rx="2" ry="3.3" fill="#1A1A1A" transform="rotate(16 60 54)" />
          <ellipse cx="34" cy="68" rx="1.9" ry="3" fill="#1A1A1A" transform="rotate(-24 34 68)" />
          <ellipse cx="48" cy="66" rx="1.9" ry="3" fill="#1A1A1A" transform="rotate(-4 48 66)" />
          <ellipse cx="58" cy="68" rx="1.9" ry="3" fill="#1A1A1A" transform="rotate(20 58 68)" />
          <ellipse cx="66" cy="68" rx="1.9" ry="3" fill="#1A1A1A" transform="rotate(28 66 68)" />
          <ellipse cx="42" cy="78" rx="1.7" ry="2.7" fill="#1A1A1A" transform="rotate(-10 42 78)" />
          <ellipse cx="56" cy="78" rx="1.7" ry="2.7" fill="#1A1A1A" transform="rotate(12 56 78)" />
        </svg>
      );

    case 'Orange':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}</defs>
          {/* Stem */}
          <path d="M 52 10 C 56 14, 58 18, 56 22" stroke="#4A2E1A" strokeWidth="3" fill="none" />
          {/* Leaf */}
          <path d="M 56 18 C 78 10, 92 18, 88 32 C 74 34, 62 28, 56 22 Z" fill="#3A8C2C" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
          {/* Orange body — bigger to match other fruits */}
          <circle cx="50" cy="56" r="38" fill="url(#grad-orange)" stroke="#000" strokeWidth="2.5" />
          {/* Segment hint lines */}
          <path d="M 50 56 Q 28 46 24 72 M 50 56 Q 72 46 76 72" stroke="#A0500A" strokeWidth="1.2" fill="none" opacity="0.4" />
          {/* Highlight */}
          <ellipse cx="34" cy="42" rx="8" ry="13" fill="#FFE8B8" opacity="0.7" transform="rotate(-15 34 42)" />
        </svg>
      );

    case 'Plum':
      return (
        <svg {...commonProps}>
          <defs>{GRADIENTS_DEFS}</defs>
          {/* Stem */}
          <path d="M 50 14 L 56 22" stroke="#4A2E1A" strokeWidth="3" />
          {/* Small leaf */}
          <path d="M 56 18 C 70 14, 78 20, 74 28 C 64 30, 58 24, 56 22 Z" fill="#3A8C2C" stroke="#000" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Plum body — bigger to match other fruits */}
          <ellipse cx="50" cy="55" rx="38" ry="40" fill="url(#grad-plum)" stroke="#000" strokeWidth="2.5" />
          {/* Center crease */}
          <path d="M 50 18 Q 46 50, 50 90" stroke="#3A0E50" strokeWidth="1.2" fill="none" opacity="0.4" />
          {/* Highlight */}
          <ellipse cx="34" cy="42" rx="7" ry="13" fill="#D8B0E8" opacity="0.75" transform="rotate(-18 34 42)" />
        </svg>
      );

    case 'Lemon':
      return (
        <svg {...commonProps}>
          <defs>
            {GRADIENTS_DEFS}
            <radialGradient id="grad-lemon-v2" cx="35%" cy="32%" r="80%">
              <stop offset="0%" stopColor="#FFF294" />
              <stop offset="60%" stopColor="#F2C828" />
              <stop offset="100%" stopColor="#8E6A0F" />
            </radialGradient>
            <linearGradient id="grad-lemon-leaf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BC04C" />
              <stop offset="100%" stopColor="#2E7D32" />
            </linearGradient>
          </defs>

          {/* Lemon body — proper oval/ovoid shape, slightly rotated for life,
              with characteristic pointed nipples at both ends. */}
          <g transform="rotate(-10 50 50)">
            <path
              d="M 50 8
                 Q 56 4, 58 10
                 C 80 14, 90 32, 88 52
                 C 86 76, 70 92, 50 92
                 Q 44 96, 42 90
                 C 22 88, 12 70, 14 52
                 C 16 28, 30 14, 50 8 Z"
              fill="url(#grad-lemon-v2)"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Small leaf at the top stem nub */}
            <path
              d="M 58 10 Q 72 6, 74 14 Q 66 16, 58 12 Z"
              fill="url(#grad-lemon-leaf)"
              stroke="#000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Glossy highlight */}
            <ellipse
              cx="32"
              cy="42"
              rx="8"
              ry="15"
              fill="#FFFFFF"
              opacity="0.55"
              transform="rotate(-20 32 42)"
            />

            {/* Subtle horizontal contour line */}
            <path
              d="M 18 54 Q 50 60, 84 52"
              stroke="#B8920C"
              strokeWidth="0.8"
              fill="none"
              opacity="0.35"
            />
          </g>
        </svg>
      );

    case 'Cherry':
      return (
        <svg {...commonProps}>
          <defs>
            <radialGradient id="grad-cherry" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#FF8A8A" />
              <stop offset="55%" stopColor="#D62828" />
              <stop offset="100%" stopColor="#6E0F14" />
            </radialGradient>
            <linearGradient id="grad-cherry-leaf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BC04C" />
              <stop offset="100%" stopColor="#2E7D32" />
            </linearGradient>
          </defs>

          {/* Twin stems joining at a single point at top */}
          <path
            d="M 50 14 Q 32 28, 30 60"
            stroke="#3D2410"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 50 14 Q 70 28, 72 64"
            stroke="#3D2410"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Leaf at the stem junction */}
          <path
            d="M 50 14 Q 74 4, 82 18 Q 70 22, 50 14 Z"
            fill="url(#grad-cherry-leaf)"
            stroke="#000"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Leaf vein */}
          <path
            d="M 54 14 Q 66 14, 78 18"
            stroke="#1F4F22"
            strokeWidth="0.8"
            fill="none"
            opacity="0.55"
          />

          {/* Left cherry — slightly higher than the right for natural cluster look */}
          <circle
            cx="28"
            cy="64"
            r="22"
            fill="url(#grad-cherry)"
            stroke="#000"
            strokeWidth="2.5"
          />
          <ellipse
            cx="20"
            cy="56"
            rx="5"
            ry="9"
            fill="#FFFFFF"
            opacity="0.5"
            transform="rotate(-20 20 56)"
          />

          {/* Right cherry — slightly lower */}
          <circle
            cx="72"
            cy="74"
            r="22"
            fill="url(#grad-cherry)"
            stroke="#000"
            strokeWidth="2.5"
          />
          <ellipse
            cx="64"
            cy="66"
            rx="5"
            ry="9"
            fill="#FFFFFF"
            opacity="0.5"
            transform="rotate(-20 64 66)"
          />

          {/* Small highlight dot on each for extra gloss */}
          <circle cx="24" cy="56" r="2" fill="#FFFFFF" opacity="0.7" />
          <circle cx="68" cy="66" r="2" fill="#FFFFFF" opacity="0.7" />
        </svg>
      );

    default:
      return <text>{symbolName}</text>;
  }
};
