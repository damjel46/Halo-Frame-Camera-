import * as MediaLibrary from 'expo-media-library';

export async function requestMediaPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function ensureAlbumExists(albumName: string): Promise<MediaLibrary.Album | null> {
  const existing = await MediaLibrary.getAlbumAsync(albumName);
  if (existing) return existing;

  // Album is created when we first save an asset into it
  return null;
}

export async function saveToTripAlbum(fileUri: string, albumName: string): Promise<string | null> {
  try {
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    const album = await MediaLibrary.getAlbumAsync(albumName);

    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync(albumName, asset, false);
    }

    return asset.uri;
  } catch {
    return null;
  }
}
