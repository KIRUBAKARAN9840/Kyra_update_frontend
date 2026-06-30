import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

const DailyPassSearchModal = ({
  visible,
  onClose,
  gyms,
  searchQuery,
  loading,
  onGymPress,
  onSearchChange,
}) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const renderCountRef = useRef(0);
  const emptyArray = useRef([]);

  useLayoutEffect(() => {
    renderCountRef.current += 1;
  });

  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top || 50 }],
    [insets.top],
  );

  const contentContainerStyle = useMemo(
    () => [styles.listContent, gyms.length === 0 && styles.listContentEmpty],
    [gyms.length],
  );

  const listEmptyComponent = useMemo(
    () =>
      loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5757" />
          <Text style={styles.loadingText}>Searching Fitness Studios...</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No Fitness Studios found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery.trim()
              ? `No Fitness Studios match "${searchQuery}"`
              : "Try adjusting your search"}
          </Text>
        </View>
      ),
    [loading, searchQuery],
  );

  const keyExtractor = useCallback(
    (item) => String(item.gym_id || item.id),
    [],
  );

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [visible]);

  const handleSearchChange = useCallback(
    (text) => {
      if (onSearchChange) onSearchChange(text);
    },
    [onSearchChange],
  );

  const handleClear = useCallback(() => {
    if (onSearchChange) onSearchChange("");
    inputRef.current?.focus();
  }, [onSearchChange]);

  const renderGymItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.gymItem}
        onPress={() => onGymPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri:
              item.image ||
              "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
          }}
          style={styles.gymImage}
          contentFit="cover"
        />
        <View style={styles.gymInfo}>
          <Text style={styles.gymName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.gymDetailsRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color="#999"
              style={styles.locationIcon}
            />
            <Text style={styles.gymLocation} numberOfLines={1}>
              {item.area || ""}
            </Text>
          </View>
          {item.distance_km != null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="navigate" size={12} color="#FF5757" />
              <Text style={styles.distanceText}>
                {item.distance_km} km away
              </Text>
            </View>
          )}
          {item.dailyPassPrice != null && (
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>₹{item.dailyPassPrice}/day</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    ),
    [onGymPress],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={headerStyle}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Search Daily Pass Fitness Studios</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search by name or area..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <FlatList
          ref={listRef}
          data={loading ? emptyArray.current : gyms}
          keyExtractor={keyExtractor}
          renderItem={renderGymItem}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmptyComponent}
        />

        {gyms.length > 0 && (
          <View style={styles.resultsCountContainer}>
            <Text style={styles.resultsCountText}>
              {gyms.length}{" "}
              {gyms.length === 1 ? "Fitness Studio" : "Fitness Studios"} with
              Daily Pass
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 32,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
  listContent: {
    paddingBottom: 80,
    paddingTop: 12,
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  gymItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  gymImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginRight: 12,
  },
  gymInfo: {
    flex: 1,
    gap: 3,
  },
  gymName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  gymDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    marginRight: 4,
  },
  gymLocation: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    fontSize: 12,
    color: "#FF5757",
    fontWeight: "500",
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5757",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
    textAlign: "center",
  },
  resultsCountContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  resultsCountText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default React.memo(DailyPassSearchModal);
