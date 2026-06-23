import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Festival } from "@/data/types";
import { capturePhoto, pickPhoto } from "@/lib/media";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

export default function JournalScreen() {
  const { festivals, journal, addJournalEntry, removeJournalEntry, visits } =
    useStore();

  // Default the festival picker to attended festivals first, then all.
  const attendedIds = visits.filter((v) => v.visited).map((v) => v.parkId);
  const orderedFestivals = useMemo(() => {
    const attended = festivals.filter((f) => attendedIds.includes(f.id));
    const rest = festivals.filter((f) => !attendedIds.includes(f.id));
    return [...attended, ...rest];
  }, [festivals, attendedIds]);

  const [festivalId, setFestivalId] = useState<string>(
    orderedFestivals[0]?.id ?? ""
  );
  const [artist, setArtist] = useState("");
  const [stage, setStage] = useState("");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  const festivalName = (id: string): string =>
    festivals.find((f) => f.id === id)?.name ?? id;

  async function attach(source: "camera" | "library") {
    try {
      const uri = source === "camera" ? await capturePhoto() : await pickPhoto();
      if (uri) setPhotoUris((prev) => [...prev, uri]);
    } catch (err) {
      Alert.alert("Photo unavailable", (err as Error).message);
    }
  }

  function save() {
    if (!artist.trim() || !festivalId) return;
    addJournalEntry({
      festivalId,
      artist: artist.trim(),
      stage: stage.trim() || undefined,
      rating: rating || undefined,
      note: note.trim() || undefined,
      photoUris: photoUris.length ? photoUris : undefined,
    });
    setArtist("");
    setStage("");
    setRating(0);
    setNote("");
    setPhotoUris([]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Setkeeper</Text>
      <Text style={styles.subtitle}>Log the sets you caught.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>FESTIVAL</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
          {orderedFestivals.slice(0, 20).map((f: Festival) => (
            <Pressable
              key={f.id}
              onPress={() => setFestivalId(f.id)}
              style={[styles.pick, festivalId === f.id && styles.pickActive]}
            >
              <Text
                style={[
                  styles.pickText,
                  festivalId === f.id && styles.pickTextActive,
                ]}
                numberOfLines={1}
              >
                {f.searchMeta.localName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>ARTIST / SET</Text>
        <TextInput
          value={artist}
          onChangeText={setArtist}
          placeholder="Who played?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>STAGE (OPTIONAL)</Text>
        <TextInput
          value={stage}
          onChangeText={setStage}
          placeholder="Main stage, Sahara…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>RATING</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n === rating ? 0 : n)} hitSlop={6}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>
                {n <= rating ? "★" : "☆"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>NOTE</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Standout moment, who you were with…"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, styles.noteInput]}
        />

        <Text style={styles.label}>PHOTOS</Text>
        <View style={styles.photoActions}>
          <Pressable style={styles.photoBtn} onPress={() => attach("camera")}>
            <Text style={styles.photoBtnText}>📷 Camera</Text>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => attach("library")}>
            <Text style={styles.photoBtnText}>🖼 Library</Text>
          </Pressable>
        </View>
        {photoUris.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {photoUris.map((uri) => (
              <Pressable
                key={uri}
                onLongPress={() =>
                  setPhotoUris((prev) => prev.filter((u) => u !== uri))
                }
              >
                <Image source={{ uri }} style={styles.thumb} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Pressable
          style={[styles.save, (!artist.trim() || !festivalId) && styles.saveDisabled]}
          onPress={save}
          disabled={!artist.trim() || !festivalId}
        >
          <Text style={styles.saveText}>Log set</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>
        LOGGED SETS · {journal.length}
      </Text>
      {journal.length === 0 ? (
        <Text style={styles.empty}>No sets logged yet.</Text>
      ) : (
        journal.map((entry) => (
          <View key={entry.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryArtist}>{entry.artist}</Text>
              {entry.rating ? (
                <Text style={styles.entryRating}>{"★".repeat(entry.rating)}</Text>
              ) : null}
            </View>
            <Text style={styles.entryMeta}>
              {festivalName(entry.festivalId)}
              {entry.stage ? ` · ${entry.stage}` : ""}
            </Text>
            {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
            {entry.photoUris?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                {entry.photoUris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.thumb} />
                ))}
              </ScrollView>
            ) : null}
            <Pressable onPress={() => removeJournalEntry(entry.id)} hitSlop={8}>
              <Text style={styles.entryDelete}>Delete</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: space.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  picker: { flexGrow: 0 },
  pick: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginRight: 8,
  },
  pickActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pickText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", maxWidth: 160 },
  pickTextActive: { color: colors.cream },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  noteInput: { minHeight: 80, textAlignVertical: "top" },
  stars: { flexDirection: "row", gap: 4 },
  star: { fontSize: 28, color: colors.textMuted },
  starOn: { color: colors.gold },
  photoActions: { flexDirection: "row", gap: 10 },
  photoBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  photoBtnText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  thumbRow: { flexGrow: 0, marginTop: 10 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    marginRight: 8,
    backgroundColor: colors.surfaceMuted,
  },
  save: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: colors.textMuted,
    marginTop: 24,
    marginBottom: 10,
  },
  empty: { color: colors.textMuted, fontStyle: "italic" },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  entryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryArtist: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  entryRating: { fontSize: 13, color: colors.gold },
  entryMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  entryNote: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  entryDelete: { fontSize: 12, color: colors.red, marginTop: 10, fontWeight: "700" },
});
