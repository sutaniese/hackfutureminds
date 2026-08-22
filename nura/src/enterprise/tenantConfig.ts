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
    surface: string
    accent: string
    accentSoft: string
  }
}

export const DEFAULT_TENANT_ID = 'pathwise'

export const TENANTS: Record<string, TenantBranding> = {
  pathwise: {
    id: 'pathwise',
    displayName: 'teñ. · PathWise',
    logoUrl: '/logo.png',
    logoMark: 'tñ',
    colors: {
      ink: '#1A2E40',
      muted: '#A2B9BC',
      surface: '#F5F5DC',
      accent: '#5F7ADB',
      accentSoft: '#E8ECFD',
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
      surface: '#f0f6ff',
      accent: '#2563eb',
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
      surface: '#faf5ff',
      accent: '#7c3aed',
      accentSoft: '#ede9fe',
    },
  },
}

export function getTenant(id: string): TenantBranding {
  return TENANTS[id] ?? TENANTS[DEFAULT_TENANT_ID]
}
