import { Linking, Platform } from 'react-native';

import { get, str } from '@/lib/format';

export type Coords = { latitude: number; longitude: number };

/**
 * Reads a map pin exactly as the API returns it (`latitude` / `longitude` on an address,
 * branch address or courier). Nothing is geocoded or guessed on the device: no pin from the
 * API means no pin in the app.
 */
export function coordsOf(row: unknown, ...path: string[]): Coords | null {
  const source = path.length ? get(row, ...path) : row;
  const latitude = Number(get(source, 'latitude'));
  const longitude = Number(get(source, 'longitude'));
  const valid =
    get(source, 'latitude') != null &&
    get(source, 'longitude') != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  return valid ? { latitude, longitude } : null;
}

/** "12 King St, Kingston" from an API place (`line1`, `city`). */
export function placeLabel(place: unknown): string {
  return [str(get(place, 'line1')), str(get(place, 'city'))].filter(Boolean).join(', ');
}

/** Opens the API's coordinates in the phone's own maps app (Apple Maps / Google Maps). */
export async function openInMaps({ latitude, longitude }: Coords, label?: string): Promise<void> {
  const ll = `${latitude},${longitude}`;
  const name = encodeURIComponent(label?.trim() || 'Location');
  const url =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${name}&ll=${ll}`
      : Platform.OS === 'android'
        ? `geo:${ll}?q=${ll}(${name})`
        : `https://www.google.com/maps/search/?api=1&query=${ll}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ll}`);
  }
}
