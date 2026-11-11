import { DefaultTheme, type Theme } from 'expo-router';
import { Platform } from 'react-native';

/**
 * GigGuru design tokens. Brand greens: #013000, #257F24, #001900, #02C800 with white.
 * #02C800 is reserved for dark surfaces — it doesn't have enough contrast on white.
 */
export const Colors = {
  primary: '#257F24',
  primaryPressed: '#1C641B',
  deep: '#013000',
  ink: '#001900',
  accent: '#02C800',
  white: '#FFFFFF',

  /** Grouped screen background (iOS Settings style); cards and list groups sit on it in white. */
  background: '#F2F5F2',
  /** Cards, list groups, plain lists, sheets and inputs. */
  card: '#FFFFFF',
  /** Neutral fill for chips, thumbnails and tiles; visible on both background and card. */
  surface: '#E9EEE9',
  /** Translucent fill for search fields and segmented controls (iOS tertiarySystemFill). */
  fill: 'rgba(118, 128, 118, 0.14)',
  /** Android press ripple. */
  ripple: 'rgba(0, 25, 0, 0.10)',
  border: '#E3E9E3',
  hairline: '#EDF1ED',
  text: '#001900',
  textMuted: '#566656',
  textFaint: '#8A978A',
  tint: '#EAF4E9',

  danger: '#C0262D',
  dangerTint: '#FDECEC',
  warning: '#8A5A00',
  warningTint: '#FFF3D6',
  info: '#1F5FA8',
  infoTint: '#E8F1FC',
  overlay: 'rgba(0, 25, 0, 0.45)',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const Type = {
  largeTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: Colors.text },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, color: Colors.text },
  headline: { fontSize: 16, fontWeight: '700', color: Colors.text },
  body: { fontSize: 15, fontWeight: '400', color: Colors.text },
  callout: { fontSize: 14, fontWeight: '500', color: Colors.text },
  caption: { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  micro: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: Colors.textMuted },
} as const;

export const Shadow = Platform.select({
  ios: { shadowColor: '#001900', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 3 },
});

/** Minimum touch target recommended by Apple HIG and Material. */
export const HitTarget = 44;
export const MaxContentWidth = 560;

/** Navigation theme: drives native headers, the web tab bar and screen backgrounds. */
export const NavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.danger,
  },
};
