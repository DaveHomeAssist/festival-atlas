/** Device location for "near me" centering + distance sort (MOBILE_APP_SPEC §5.3). */
import * as Location from "expo-location";
import type { Coordinates } from "@/data/types";

export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error("Location permission denied");
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
