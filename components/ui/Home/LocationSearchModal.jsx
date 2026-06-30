import { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCachedLocation,
  clearLocationCache,
} from "../../../services/locationCache";
import * as Location from "expo-location";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const SEARCH_DEBOUNCE_MS = 600;
const MIN_QUERY_LEN = 3;

const buildLabel = (item) => {
  const a = item.address || {};
  const primary =
    a.suburb ||
    a.neighbourhood ||
    a.village ||
    a.town ||
    a.city_district ||
    a.city ||
    a.county ||
    item.name ||
    "";
  const secondary = [a.city || a.town || a.village, a.state]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");
  return { primary: primary || secondary || item.display_name, secondary };
};

export default function LocationSearchModal({
  visible,
  onClose,
  onSelect,
  hasOverride,
  onUseCurrentLocation,
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingCurrent, setUsingCurrent] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // Reset state on close
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setError(null);
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } else {
      // Autofocus shortly after the modal animates in
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const runSearch = useCallback(async (q) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const url =
        `${NOMINATIM_URL}?q=${encodeURIComponent(q)}` +
        `&format=json&addressdetails=1&countrycodes=in&limit=8`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en",
          "User-Agent": "Fymble-App/1.0 (support@fymble.app)",
        },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError("Couldn't load suggestions. Check your connection.");
      setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Debounce query → search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      setResults([]);
      setLoading(false);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleSelect = useCallback(
    (item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const { primary } = buildLabel(item);
      Keyboard.dismiss();
      onSelect({ lat, lng, label: primary, fullName: item.display_name });
    },
    [onSelect],
  );

  const handleUseCurrent = useCallback(async () => {
    if (usingCurrent) return;
    setUsingCurrent(true);
    try {
      // Force a fresh GPS fetch in case override was sticky for a while
      clearLocationCache();
      const coords = await getCachedLocation();
      if (!coords) {
        setError("Location permission needed. Please enable it from settings.");
        return;
      }
      let label = "Current location";
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });
        if (geo && geo.length > 0) {
          const r = geo[0];
          label = r.district || r.subregion || r.city || r.name || label;
        }
      } catch {}
      Keyboard.dismiss();
      onUseCurrentLocation({ lat: coords.lat, lng: coords.lng, label });
    } finally {
      setUsingCurrent(false);
    }
  }, [usingCurrent, onUseCurrentLocation]);

  const showEmpty =
    !loading &&
    query.trim().length >= MIN_QUERY_LEN &&
    results.length === 0 &&
    !error;

  const renderItem = ({ item }) => {
    const { primary, secondary } = buildLabel(item);
    return (
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.6}
        onPress={() => handleSelect(item)}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color="#8A94A6"
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.resultPrimary} numberOfLines={1}>
            {primary}
          </Text>
          {!!secondary && (
            <Text style={styles.resultSecondary} numberOfLines={1}>
              {secondary}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change location</Text>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search city, area or pincode"
            placeholderTextColor="#8A94A6"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
          />
          {!!query && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#8A94A6" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.currentLocationRow}
          activeOpacity={0.7}
          onPress={handleUseCurrent}
          disabled={usingCurrent}
        >
          {usingCurrent ? (
            <ActivityIndicator size="small" color="#FF5757" />
          ) : (
            <Ionicons name="navigate" size={18} color="#FF5757" />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.currentLocationPrimary}>
              Use current location
            </Text>
            <Text style={styles.currentLocationSecondary}>
              {hasOverride ? "Switch back to GPS" : "Using GPS"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {loading && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#FF5757" />
              <Text style={styles.statusText}>Searching…</Text>
            </View>
          )}

          {!!error && !loading && (
            <View style={styles.statusBox}>
              <Ionicons name="cloud-offline-outline" size={20} color="#8A94A6" />
              <Text style={styles.statusText}>{error}</Text>
            </View>
          )}

          {showEmpty && (
            <View style={styles.statusBox}>
              <Ionicons name="search-outline" size={20} color="#8A94A6" />
              <Text style={styles.statusText}>No matches found</Text>
            </View>
          )}

          {query.trim().length < MIN_QUERY_LEN && !loading && (
            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Search any city or area</Text>
              <Text style={styles.hintBody}>
                Try “Indiranagar”, “Bangalore” or “560038”. Tap a result to load
                gyms and sessions in that area.
              </Text>
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.place_id ?? idx}`}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeBtn: { padding: 4, marginRight: 6 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    paddingVertical: 0,
  },
  currentLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  currentLocationPrimary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
  },
  currentLocationSecondary: {
    fontSize: 11,
    color: "#8A94A6",
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: "#EEF1F5", marginHorizontal: 14 },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  statusText: { fontSize: 13, color: "#525252" },
  hintBox: { paddingHorizontal: 18, paddingVertical: 18 },
  hintTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  hintBody: { fontSize: 12, color: "#8A94A6", marginTop: 4, lineHeight: 17 },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultPrimary: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  resultSecondary: { fontSize: 11, color: "#8A94A6", marginTop: 2 },
});
