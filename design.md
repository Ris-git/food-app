# Design — Foody

Locked design system extracted from studied reference (Swiggy Hero DNA) & customized with Foody Fresh Emerald palette. Future Hallmark runs read this file first; pages defer to it.

## System
- Genre · playful
- Macrostructure · Search & Hero Flood (Single-Stage Search Hero)
- Theme · custom (vibe: "fresh emerald & electric mint food-tech landing canvas")
- Axes · mid (fresh emerald canvas) / heavy-geometric-sans / emerald-mint

## Provenance
- Source mode: image (user-attached screenshot of Swiggy hero)
- Date: 2026-07-31
- Attestation: Public reference for user's own brand (Foody)
- Confidence: High (visual pass on hero layout, palette, typography, and card treatments)

## Tokens (canonical · `tokens.css` is the source of truth)
```css
:root {
  --color-paper:      oklch(32% 0.12 165);     /* Deep Forest Emerald Canvas (#064E3B) */
  --color-paper-2:    oklch(100% 0 0);         /* Elevated Crisp White Cards & Inputs (#FFFFFF) */
  --color-ink:        oklch(100% 0 0);         /* Pure White Heading Ink on Emerald (#FFFFFF) */
  --color-ink-dark:   oklch(15% 0.03 260);     /* Dark Ink for Text inside White Inputs (#0F172A) */
  --color-rule:       oklch(92% 0.01 165);     /* Soft Border / Rule */
  --color-accent:     oklch(72% 0.19 160);     /* Electric Lime Mint Accent (#10B981) */
  --color-accent-ink: oklch(18% 0.05 160);     /* Dark Emerald Text on Accent (#022C22) */
  --color-focus:      oklch(72% 0.19 160);     /* Mint Focus Ring on Inputs */

  --font-display: "Plus Jakarta Sans", "Outfit", system-ui, sans-serif;
  --font-body:    "Inter", system-ui, sans-serif;
  --font-mono:    "Geist Mono", monospace;

  /* Spacing Scale */
  --space-3xs: 4px; --space-2xs: 8px; --space-xs: 12px; --space-sm: 16px;
  --space-md: 24px; --space-lg: 32px; --space-xl: 48px; --space-2xl: 64px;

  /* Border Radii */
  --radius-card: 28px;
  --radius-pill: 9999px;
  --radius-input: 16px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 180ms;  --dur-base: 240ms;  --dur-slow: 320ms;
}
```

## CTA Voice
- Primary · Electric Mint Pill (`#10B981`) · `--radius-pill` · padding `12px 28px`
- Secondary · Outline Pill with White Border (`rgba(255,255,255,0.9)`) · `--radius-pill` · padding `12px 24px`

## Motion Stance
- Staggered entrance reveals on hero heading and search bar inputs.
- Smooth hover elevation on CTA pills and search input focus states.
- Reduced-motion fallback · ≤150 ms opacity crossfade.

## Notes & Exclusions (Do NOT carry over)
- Custom Brand Color: Distinctive Fresh Emerald `#064E3B` and Mint `#10B981` (replaces generic orange).
- Excluded top nav item: "Swiggy Corporate" (only keep "Partner with us", "Get the App ↗", "Sign in").
- Excluded hero service tiles: "FOOD DELIVERY", "INSTAMART", "DINEOUT" boxes (hero ends cleanly below the search bar).
- Clean, self-contained single-page hero with fully interactive, non-navigating button handlers.
