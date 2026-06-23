import React, { useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  type Region,
} from "react-native-maps";
import type { Coordinates, Festival } from "@/data/types";

// Continental-US default frame.
const US_REGION: Region = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 30,
  longitudeDelta: 40,
};

export interface FestivalMapHandle {
  centerOn: (coords: Coordinates) => void;
}

interface Props {
  festivals: Festival[];
  routeStops?: Festival[];
  onSelect: (festivalId: string) => void;
}

export const FestivalMap = React.forwardRef<FestivalMapHandle, Props>(
  function FestivalMap({ festivals, routeStops = [], onSelect }, ref) {
    const mapRef = useRef<MapView>(null);

    React.useImperativeHandle(ref, () => ({
      centerOn(coords: Coordinates) {
        mapRef.current?.animateToRegion(
          {
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 6,
            longitudeDelta: 6,
          },
          600
        );
      },
    }));

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={US_REGION}
        showsUserLocation
      >
        {festivals.map((f) => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.coordinates.lat, longitude: f.coordinates.lng }}
            pinColor={f.color}
            title={f.name}
            description={`${f.genre} · ${f.city}`}
            onCalloutPress={() => onSelect(f.id)}
          />
        ))}
        {routeStops.length > 1 ? (
          <Polyline
            coordinates={routeStops.map((f) => ({
              latitude: f.coordinates.lat,
              longitude: f.coordinates.lng,
            }))}
            strokeColor="#F15C41"
            strokeWidth={3}
          />
        ) : null}
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: { flex: 1 },
});
