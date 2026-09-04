/**
 * OTH Design System — Theme Tokens
 * Material Design 3 + Cybersecurity aesthetic
 */

export const Colors = {
  // Primary palette
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primarySurface: '#EFF6FF',

  // Background
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',
  surface: '#1E293B',
  surfaceVariant: '#334155',

  // Success
  success: '#16A34A',
  successLight: '#22C55E',
  successSurface: '#F0FDF4',

  // Error / Alert
  error: '#DC2626',
  errorLight: '#EF4444',
  errorSurface: '#FEF2F2',

  // Warning
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningSurface: '#FFFBEB',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Border
  border: '#334155',
  borderLight: '#475569',

  // Glassmorphism
  glass: 'rgba(30, 41, 59, 0.8)',
  glassBorder: 'rgba(148, 163, 184, 0.2)',

  // Status
  online: '#22C55E',
  offline: '#6B7280',
  pending: '#F59E0B',

  // Risk scoring
  riskLow: '#16A34A',
  riskMedium: '#D97706',
  riskHigh: '#DC2626',
  riskCritical: '#991B1B',
} as const;

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    mono: 'SpaceMono_400Regular',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export type ColorKey = keyof typeof Colors;
