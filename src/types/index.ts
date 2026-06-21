// Circle guide stored as ratios (0-1) so it's screen-size independent
export interface CircleGuide {
  xRatio: number;     // center X / screen width
  yRatio: number;     // center Y / screen height
  radiusRatio: number; // radius / screen width
}

// Per-photo alignment correction: how much to shift the photo so
// its circular object lands on the trip's CircleGuide
export interface PhotoAdjustment {
  panX: number;  // horizontal shift in pixels (on a 390pt wide canvas)
  panY: number;  // vertical shift in pixels
  scale: number; // zoom factor (default 1.0)
}

export interface Trip {
  id: string;
  name: string;
  albumName: string;
  createdAt: string;
  circle: CircleGuide;
  coverPhotoId?: string;
}

export interface TripPhoto {
  id: string;
  tripId: string;
  uri: string;
  order: number;
  createdAt: string;
  adjustment: PhotoAdjustment;
}

export type RootStackParamList = {
  Trips: undefined;
  CreateTrip: undefined;
  // Camera mode: 'setup' → after shot go to CircleSetup, 'shoot' → go back to TripDetail
  Camera: { tripId: string; mode: 'setup' | 'shoot' };
  CircleSetup: { tripId: string; photoUri: string };
  TripDetail: { tripId: string };
  AlignPhoto: { tripId: string; photoId: string };
  VideoEdit: { tripId: string };
};
