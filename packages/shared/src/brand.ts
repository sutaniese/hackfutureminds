/**
 * Single source of truth for product brand across the student shell and `/hub`.
 */

export const BRAND = {
  /** Public product name (Kazakh latin spelling preferred in UI). */
  productName: "PathWise",
  /** Short brand mark used in the header logo when the asset isn't available. */
  brandMark: "teñ",
  /** Visible tagline used in headers, share-cards, and PDF reports. */
  tagline: "AI-навигатор поступления для школьников Казахстана",
  /** Color palette mirrored in `apps/student/src/app/globals.css` (`--pw-*`). */
  colors: {
    bg: "#FFFFFF",
    surface: "#F5F8FF",
    ink: "#0F172A",
    muted: "#64748B",
    accent: "#7AA0E5",
    accentStrong: "#4F7FD1",
    accentSoft: "#EAF1FC",
  },
} as const;

export type BrandColors = typeof BRAND.colors;
