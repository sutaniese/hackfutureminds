/** Конфиг white-label по tenant_id (ЕНТ-центр / партнёр) */
export type TenantBranding = {
  id: string
  displayName: string
  /** Публичный URL логотипа или null — тогда logoMark */
  logoUrl: string | null
  /** Короткая метка в «круге», если нет картинки */
  logoMark: string
  colors: {
    ink: string
    muted: string
    /** Cards / header surfaces (usually #fff, aligned with `sutaniese` –pw-surface) */
    surface: string
    /** Page background behind cards (e.g. #f4f6fb — PathWise `sutaniese`) */
    pageBg: string
    border: string
    accent: string
    accentStrong?: string
    accentSoft: string
  }
}

export const DEFAULT_TENANT_ID = 'pathwise'

export const TENANTS: Record<string, TenantBranding> = {
  pathwise: {
    id: 'pathwise',
    displayName: 'teñ',
    logoUrl: '/logo.png',
    logoMark: 'teñ',
    // Match `hacksteppe/sutaniese` globals: primary #1d4ed8, page #f4f6fb, borders #e2e8f0
    colors: {
      ink: '#0f172a',
      muted: '#64748b',
      surface: '#ffffff',
      pageBg: '#f4f6fb',
      border: '#e2e8f0',
      accent: '#1d4ed8',
      accentStrong: '#1e40af',
      accentSoft: '#eff6ff',
    },
  },
  'ent-iq-hub': {
    id: 'ent-iq-hub',
    displayName: 'IQ Hub — ЕНТ-центр (демо white-label)',
    logoUrl: null,
    logoMark: 'IQ',
    colors: {
      ink: '#0c1e3c',
      muted: '#5b6b8c',
      surface: '#ffffff',
      pageBg: '#f0f6ff',
      border: '#e2e8f0',
      accent: '#2563eb',
      accentStrong: '#1d4ed8',
      accentSoft: '#dbeafe',
    },
  },
  'ent-stem-lab': {
    id: 'ent-stem-lab',
    displayName: 'STEM Lab Almaty (демо)',
    logoUrl: null,
    logoMark: 'SL',
    colors: {
      ink: '#1e1b4b',
      muted: '#6b6680',
      surface: '#ffffff',
      pageBg: '#faf5ff',
      border: '#e2e8f0',
      accent: '#7c3aed',
      accentStrong: '#5b21b6',
      accentSoft: '#ede9fe',
    },
  },
}

export function getTenant(id: string): TenantBranding {
  return TENANTS[id] ?? TENANTS[DEFAULT_TENANT_ID]
}
