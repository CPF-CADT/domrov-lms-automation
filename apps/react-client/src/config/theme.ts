/**
 * Theme constants for the Domrov LMS application.
 * Centralizes styling tokens for consistent theming across components.
 */
export const THEME = {
  primary: "bg-primary",
  primaryHover: "hover:bg-primary-dark",
  textMain: "text-primary",
  bgLight: "bg-primary-light",
  accent: "text-accent",
} as const;

export type ThemeKey = keyof typeof THEME;
