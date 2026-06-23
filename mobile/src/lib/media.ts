/**
 * Photo capture/selection for journal entries (MOBILE_APP_SPEC §5.6). Photos
 * stay on device; we keep only the local URI on the entry.
 */
import * as ImagePicker from "expo-image-picker";

const PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.6,
  allowsEditing: false,
};

export async function capturePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("Camera permission denied");
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTS);
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Photo library permission denied");
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}
