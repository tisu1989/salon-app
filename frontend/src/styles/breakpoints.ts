/**
 * Single source of truth for the three tiers defined in the Front Desk Blueprint's
 * "Responsive rules" section. CSS media queries below use the same numbers literally
 * (a media query can't reference a CSS custom property) - if these ever change, the
 * matching `px` values in src/styles/*.css must be updated too.
 */
export const BREAKPOINTS = {
  tabletMin: 640,
  desktopMin: 1024,
} as const;
