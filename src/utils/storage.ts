import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripPhoto } from '../types';

const TRIPS_KEY = '@halo:trips';

function photosKey(tripId: string) {
  return `@halo:photos:${tripId}`;
}

// ── Trips ──────────────────────────────────────────────────────────────

export async function getTrips(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(TRIPS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const trips = await getTrips();
  return trips.find(t => t.id === tripId) ?? null;
}

export async function saveTrip(trip: Trip): Promise<void> {
  const trips = await getTrips();
  const idx = trips.findIndex(t => t.id === trip.id);
  if (idx >= 0) trips[idx] = trip;
  else trips.unshift(trip);
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export async function deleteTrip(tripId: string): Promise<void> {
  const trips = await getTrips();
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips.filter(t => t.id !== tripId)));
  await AsyncStorage.removeItem(photosKey(tripId));
}

// ── Photos ─────────────────────────────────────────────────────────────

export async function getPhotos(tripId: string): Promise<TripPhoto[]> {
  const raw = await AsyncStorage.getItem(photosKey(tripId));
  const photos: TripPhoto[] = raw ? JSON.parse(raw) : [];
  return photos.sort((a, b) => a.order - b.order);
}

export async function savePhoto(photo: TripPhoto): Promise<void> {
  const photos = await getPhotos(photo.tripId);
  const idx = photos.findIndex(p => p.id === photo.id);
  if (idx >= 0) photos[idx] = photo;
  else photos.push(photo);
  await AsyncStorage.setItem(photosKey(photo.tripId), JSON.stringify(photos));
}

export async function deletePhoto(tripId: string, photoId: string): Promise<void> {
  const photos = await getPhotos(tripId);
  const updated = photos.filter(p => p.id !== photoId);
  // reorder
  updated.forEach((p, i) => { p.order = i; });
  await AsyncStorage.setItem(photosKey(tripId), JSON.stringify(updated));
}

export async function reorderPhotos(tripId: string, orderedIds: string[]): Promise<void> {
  const photos = await getPhotos(tripId);
  const map = new Map(photos.map(p => [p.id, p]));
  const reordered = orderedIds
    .map((id, i) => {
      const p = map.get(id);
      if (!p) return null;
      return { ...p, order: i };
    })
    .filter(Boolean) as TripPhoto[];
  await AsyncStorage.setItem(photosKey(tripId), JSON.stringify(reordered));
}
